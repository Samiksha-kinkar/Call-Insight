from pathlib import Path

import chromadb

from app.rag.embedding_service import embedding_service


class VectorStore:

    def __init__(
        self,
        collection_name: str = "call_transcripts",
    ):

        storage_path = (
            Path(__file__).resolve().parents[2]
            / "data"
            / "vector_db"
        )

        storage_path.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.client = chromadb.PersistentClient(
            path=str(storage_path)
        )

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={
                "description": (
                    "CallInsight customer call transcript chunks"
                )
            },
        )

    def add_chunks(
        self,
        chunks: list[str],
        call_id: str,
    ):

        if not chunks:
            return

        embeddings = embedding_service.embed_documents(
            chunks
        )

        ids = [
            f"{call_id}_chunk_{index}"
            for index in range(len(chunks))
        ]

        metadatas = [
            {
                "call_id": call_id,
                "chunk_id": f"{call_id}_chunk_{index}",
            }
            for index in range(len(chunks))
        ]

        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return {
            "call_id": call_id,
            "chunks_stored": len(chunks),
        }

    def search(
        self,
        query: str,
        n_results: int = 5,
    ):
        """
        Search the vector database and return relevant chunks
        from different calls.

        Chroma normally returns the top N most similar chunks,
        which can result in all N chunks coming from the same call.

        For CallInsight, we want cross-call retrieval, so we:
        1. Search the entire collection.
        2. Keep results ordered by semantic relevance.
        3. Keep only the best chunk from each unique call.
        4. Return up to n_results different calls.
        """

        # Create embedding for the user's question
        query_embedding = embedding_service.embed_text(
            query
        )

        # Check whether the vector database contains anything
        total_chunks = self.collection.count()

        if total_chunks == 0:
            return {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]],
            }

        # Search across ALL stored chunks.
        
        # This is intentional for now because CallInsight needs
        # to find relevant information across different calls,
        # rather than allowing one call to dominate the results.
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=total_chunks,
        )

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        # ---------------------------------------------------------
        # Keep only the best result from each unique call
        # ---------------------------------------------------------

        selected_ids = []
        selected_documents = []
        selected_metadatas = []
        selected_distances = []

        seen_call_ids = set()

        for index, metadata in enumerate(metadatas):

            call_id = metadata.get("call_id")

            if not call_id:
                continue

            # Skip additional chunks from a call we've already
            # selected.
            if call_id in seen_call_ids:
                continue

            seen_call_ids.add(call_id)

            selected_ids.append(
                ids[index]
            )

            selected_documents.append(
                documents[index]
            )

            selected_metadatas.append(
                metadata
            )

            if index < len(distances):
                selected_distances.append(
                    distances[index]
                )
            else:
                selected_distances.append(
                    None
                )

            # Stop once we have the requested number of
            # different calls.
            if len(selected_documents) >= n_results:
                break

        return {
            "ids": [selected_ids],
            "documents": [selected_documents],
            "metadatas": [selected_metadatas],
            "distances": [selected_distances],
        }


# Shared vector store instance
vector_store = VectorStore()