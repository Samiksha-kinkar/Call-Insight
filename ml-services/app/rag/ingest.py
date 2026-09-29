from app.database.mongodb import get_all_calls
from app.rag.chunking_service import chunking_service
from app.rag.vector_store import vector_store


def ingest_all_calls():
    """
    Ingest all call transcripts from MongoDB into ChromaDB.
    """

    calls = get_all_calls()

    if not calls:
        print("No calls found in MongoDB.")
        return

    print("=" * 60)
    print("RAG INGESTION")
    print("=" * 60)

    print(f"Found {len(calls)} calls in MongoDB.")

    total_chunks = 0
    successful_calls = 0

    for call in calls:

        call_id = call.get("call_id")
        transcript = call.get("transcript")

        if not call_id:
            print("Skipping call with no call_id.")
            continue

        if not transcript or not transcript.strip():
            print(
                f"Skipping {call_id}: "
                "no transcript found."
            )
            continue

        print("\n" + "-" * 60)
        print(f"Processing call: {call_id}")
        print("-" * 60)

        # 1. Chunk transcript
        chunks = chunking_service.split_text(
            transcript
        )

        print(
            f"Created {len(chunks)} chunks."
        )

        if not chunks:
            print(
                f"Skipping {call_id}: "
                "no chunks created."
            )
            continue

        # 2. Embed + store in ChromaDB
        result = vector_store.add_chunks(
            chunks=chunks,
            call_id=call_id,
        )

        print(
            f"Stored {len(chunks)} chunks "
            f"in ChromaDB."
        )

        successful_calls += 1
        total_chunks += len(chunks)

    print("\n" + "=" * 60)
    print("INGESTION COMPLETE")
    print("=" * 60)

    print(
        f"Calls processed: {successful_calls}"
    )

    print(
        f"Total chunks added/updated: {total_chunks}"
    )

    print(
        f"Total chunks currently in ChromaDB: "
        f"{vector_store.collection.count()}"
    )


if __name__ == "__main__":

    ingest_all_calls()

    print("\n" + "=" * 60)
    print("TESTING VECTOR SEARCH")
    print("=" * 60)

    results = vector_store.search(
        query="customer wants a refund",
        n_results=5,
    )

    documents = results.get(
        "documents",
        [[]],
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]],
    )[0]

    print(
        f"\nRetrieved {len(documents)} chunks."
    )

    for index, document in enumerate(documents):

        print("\n" + "-" * 60)

        call_id = (
            metadatas[index].get("call_id")
            if index < len(metadatas)
            else "unknown"
        )

        print(
            f"Result {index + 1} "
            f"(Call: {call_id})"
        )

        print("-" * 60)

        print(document)