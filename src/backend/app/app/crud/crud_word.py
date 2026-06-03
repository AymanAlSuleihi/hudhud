import json
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.epigraph import Epigraph
from app.models.word import Word, WordConnection, WordCreate, WordOut, WordsOut, WordUpdate, WordMinimal, WordsMinimalOut
from app.models.links import EpigraphWordLink, WordLink


class CRUDWord(CRUDBase[Word, WordCreate, WordUpdate]):
    def _top_connection_count(self):
        return (
            select(func.count(WordLink.to_word_id))
            .where(WordLink.from_word_id == Word.id)
            .correlate(Word)
            .scalar_subquery()
        )

    def _epigraph_count(self):
        return (
            select(func.count(EpigraphWordLink.epigraph_id))
            .where(EpigraphWordLink.word_id == Word.id)
            .correlate(Word)
            .scalar_subquery()
        )

    def _build_word_out(
        self,
        word: Word,
        *,
        connections: list[WordConnection] | None = None,
        related_epigraphs_limit: int = 10,
    ) -> WordOut:
        return WordOut(
            id=word.id,
            word=word.word,
            classification=word.classification,
            attributes=word.attributes,
            language_level_1=word.language_level_1,
            language_level_2=word.language_level_2,
            language_level_3=word.language_level_3,
            frequency=word.frequency,
            epigraph_count=len(word.epigraphs),
            words=connections or [],
            epigraphs=word.epigraphs[:related_epigraphs_limit],
        )

    def get_word_out(
        self,
        db: Session,
        *,
        id: int,
        related_epigraphs_limit: int = 10,
        related_words_limit: int = 10,
    ) -> WordOut | None:
        word = (
            db.query(self.model)
            .options(selectinload(self.model.epigraphs))
            .filter(self.model.id == id)
            .first()
        )
        if not word:
            return None

        connection_ranked = (
            select(
                WordLink.from_word_id.label("from_word_id"),
                WordLink.to_word_id.label("to_word_id"),
                Word.word.label("word"),
                WordLink.count.label("count"),
                func.row_number().over(
                    partition_by=WordLink.from_word_id,
                    order_by=desc(WordLink.count),
                ).label("rn"),
            )
            .join(Word, Word.id == WordLink.to_word_id)
            .where(WordLink.from_word_id == id)
            .subquery()
        )

        connection_rows = db.execute(
            select(
                connection_ranked.c.to_word_id,
                connection_ranked.c.word,
                connection_ranked.c.count,
            ).where(connection_ranked.c.rn <= related_words_limit)
        ).all()

        connections = [
            WordConnection(id=to_word_id, word=connection_word, count=connection_count)
            for to_word_id, connection_word, connection_count in connection_rows
        ]

        return self._build_word_out(word, connections=connections, related_epigraphs_limit=related_epigraphs_limit)

    def get_words_out(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        sort_field: str | None = None,
        sort_order: str | None = None,
        filters: str | None = None,
        related_epigraphs_limit: int = 10,
        related_words_limit: int = 10,
    ) -> WordsOut:
        words_statement = (
            select(self.model)
            .options(selectinload(self.model.epigraphs))
            .offset(skip)
            .limit(limit)
        )

        if filters:
            filters_dict = json.loads(filters)
            for key, value in filters_dict.items():
                if isinstance(value, bool):
                    words_statement = words_statement.where(
                        getattr(self.model, key).is_(value)
                    )
                else:
                    words_statement = words_statement.where(
                        getattr(self.model, key) == value
                    )

        if sort_field:
            if sort_field == "words":
                sort_field = self._top_connection_count()
            elif sort_field == "epigraphs":
                sort_field = self._epigraph_count()
            if sort_order == "desc":
                words_statement = words_statement.order_by(desc(sort_field))
            else:
                words_statement = words_statement.order_by(asc(sort_field))

        words = db.execute(words_statement).scalars().all()
        total_count = db.execute(select(func.count()).select_from(self.model)).scalar_one()

        word_ids = [word.id for word in words]
        connections_map: dict[int, list[WordConnection]] = {word_id: [] for word_id in word_ids}

        if word_ids:
            connection_ranked = (
                select(
                    WordLink.from_word_id.label("from_word_id"),
                    WordLink.to_word_id.label("to_word_id"),
                    Word.word.label("word"),
                    WordLink.count.label("count"),
                    func.row_number().over(
                        partition_by=WordLink.from_word_id,
                        order_by=desc(WordLink.count),
                    ).label("rn"),
                )
                .join(Word, Word.id == WordLink.to_word_id)
                .where(WordLink.from_word_id.in_(word_ids))
                .subquery()
            )

            connection_rows = db.execute(
                select(
                    connection_ranked.c.from_word_id,
                    connection_ranked.c.to_word_id,
                    connection_ranked.c.word,
                    connection_ranked.c.count,
                ).where(connection_ranked.c.rn <= related_words_limit)
            ).all()

            for from_word_id, to_word_id, connection_word, connection_count in connection_rows:
                connections_map[from_word_id].append(
                    WordConnection(
                        id=to_word_id,
                        word=connection_word,
                        count=connection_count,
                    )
                )

        return WordsOut(
            words=[
                self._build_word_out(
                    word,
                    connections=connections_map.get(word.id, []),
                    related_epigraphs_limit=related_epigraphs_limit
                )
                for word in words
            ],
            count=total_count,
        )

    def get_words_minimal_out(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        sort_field: str | None = None,
        sort_order: str | None = None,
        filters: str | None = None,
    ) -> WordsMinimalOut:
        """
        Retrieve words.
        """
        total_count_statement = select(func.count()).select_from(Word)
        total_count = db.execute(total_count_statement).scalar_one()

        words_statement = select(Word).offset(skip).limit(limit)

        if filters:
            filters_dict = json.loads(filters)
            for key, value in filters_dict.items():
                if isinstance(value, bool):
                    words_statement = words_statement.where(
                        getattr(Word, key).is_(value)
                    )
                else:
                    words_statement = words_statement.where(
                        getattr(Word, key) == value
                    )

        if sort_field:
            if sort_field == "words":
                sort_field = (
                    select(func.count(WordLink.to_word_id))
                    .where(WordLink.from_word_id == Word.id)
                    .scalar_subquery()
                )
            elif sort_field == "epigraphs":
                sort_field = (
                    select(func.count(EpigraphWordLink.epigraph_id))
                    .where(EpigraphWordLink.word_id == Word.id)
                    .scalar_subquery()
                )
            if sort_order == "desc":
                words_statement = words_statement.order_by(desc(sort_field))
            else:
                words_statement = words_statement.order_by(asc(sort_field))

        epigraph_counts = dict(
            db.execute(
                select(
                    EpigraphWordLink.word_id,
                    func.count(EpigraphWordLink.epigraph_id).label("epigraph_count"),
                ).where(EpigraphWordLink.word_id.in_([word.id for word in db.execute(words_statement).scalars().all()]))
                .group_by(EpigraphWordLink.word_id)
            ).all()
        )

        words = db.execute(words_statement).scalars().all()

        words_minimal = [
            WordMinimal(
                id=word.id,
                word=word.word,
                classification=word.classification,
                attributes=word.attributes,
                language_level_1=word.language_level_1,
                language_level_2=word.language_level_2,
                language_level_3=word.language_level_3,
                frequency=word.frequency,
                epigraph_count=epigraph_counts.get(word.id, 0),
            )
            for word in words
        ]

        return WordsMinimalOut(words=words_minimal, count=total_count)


    def get_by_word(
        self,
        db: Session,
        *,
        word: str,
        classification: Optional[str] = None,
        attributes: Optional[dict] = None,
        language_level_1: Optional[str] = None,
        language_level_2: Optional[str] = None,
        language_level_3: Optional[str] = None,
    ) -> Optional[Word]:
        attributes = attributes or {}

        word = (word or "").lower()
        query = db.query(self.model).filter(self.model.word == word)
        if classification is None:
            query = query.filter(self.model.classification.is_(None))
        else:
            query = query.filter(self.model.classification == classification)

        query = query.filter(self.model.attributes == attributes)

        if language_level_1 is None:
            query = query.filter(self.model.language_level_1.is_(None))
        else:
            query = query.filter(self.model.language_level_1 == language_level_1)

        if language_level_2 is None:
            query = query.filter(self.model.language_level_2.is_(None))
        else:
            query = query.filter(self.model.language_level_2 == language_level_2)

        if language_level_3 is None:
            query = query.filter(self.model.language_level_3.is_(None))
        else:
            query = query.filter(self.model.language_level_3 == language_level_3)

        return query.first()
    def get_by_word(self, db: Session, *, word: str) -> Optional[Word]:
        return db.query(self.model).filter(self.model.word == word).first()

    def link_words(self, db: Session, *, from_word: Word, to_word: Word) -> Word:
        link = db.query(WordLink).filter(
            WordLink.from_word_id == from_word.id,
            WordLink.to_word_id == to_word.id,
        ).first()

        if not link:
            link = WordLink(from_word_id=from_word.id, to_word_id=to_word.id)
            db.add(link)
        else:
            link.count += 1

        db.commit()
        return from_word

    def link_to_epigraph(self, db: Session, *, word: Word, epigraph_id: int) -> Word:
        epigraph = db.query(Epigraph).get(epigraph_id)
        if not epigraph:
            raise ValueError(f"Epigraph with id {epigraph_id} not found")

        link = db.query(EpigraphWordLink).filter(
            EpigraphWordLink.epigraph_id == epigraph_id,
            EpigraphWordLink.word_id == word.id,
        ).first()

        if link:
            return word

        link = EpigraphWordLink(epigraph_id=epigraph_id, word_id=word.id)
        db.add(link)
        db.commit()
        return word


word = CRUDWord(Word)
