from langchain_text_splitters import RecursiveCharacterTextSplitter


class ChunkingService:

    def __init__(
        self,
        chunk_size: int = 700,
        chunk_overlap: int = 150,
    ):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n\n",
                "\n",
                ". ",
                "? ",
                "! ",
                " ",
                "",
            ],
        )

    def split_text(self, text: str) -> list[str]:

        if not text or not text.strip():
            return []

        return self.splitter.split_text(text)


chunking_service = ChunkingService()