"""Add DASI sync state

Revision ID: f4f7a1c2d9e0
Revises: e2f7a9d4c3b1
Create Date: 2026-05-07 15:40:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


revision = "f4f7a1c2d9e0"
down_revision = "e2f7a9d4c3b1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "dasiimportcursor",
        sa.Column("entity_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("last_completed_page", sa.Integer(), nullable=False),
        sa.Column("last_seen_dasi_id", sa.Integer(), nullable=True),
        sa.Column("total_items_hint", sa.Integer(), nullable=True),
        sa.Column("last_started_at", sa.DateTime(), nullable=True),
        sa.Column("last_completed_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_type", name="uq_dasiimportcursor_entity_type"),
    )
    op.create_index(op.f("ix_dasiimportcursor_entity_type"), "dasiimportcursor", ["entity_type"], unique=False)
    op.create_index(op.f("ix_dasiimportcursor_id"), "dasiimportcursor", ["id"], unique=False)

    op.create_table(
        "dasisourcesnapshot",
        sa.Column("entity_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("dasi_id", sa.Integer(), nullable=False),
        sa.Column("source_url", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("source_last_modified", sa.DateTime(), nullable=True),
        sa.Column("payload_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "entity_type",
            "dasi_id",
            name="uq_dasisourcesnapshot_entity_type_dasi_id",
        ),
    )
    op.create_index(op.f("ix_dasisourcesnapshot_dasi_id"), "dasisourcesnapshot", ["dasi_id"], unique=False)
    op.create_index(op.f("ix_dasisourcesnapshot_entity_type"), "dasisourcesnapshot", ["entity_type"], unique=False)
    op.create_index(op.f("ix_dasisourcesnapshot_id"), "dasisourcesnapshot", ["id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_dasisourcesnapshot_id"), table_name="dasisourcesnapshot")
    op.drop_index(op.f("ix_dasisourcesnapshot_entity_type"), table_name="dasisourcesnapshot")
    op.drop_index(op.f("ix_dasisourcesnapshot_dasi_id"), table_name="dasisourcesnapshot")
    op.drop_table("dasisourcesnapshot")

    op.drop_index(op.f("ix_dasiimportcursor_id"), table_name="dasiimportcursor")
    op.drop_index(op.f("ix_dasiimportcursor_entity_type"), table_name="dasiimportcursor")
    op.drop_table("dasiimportcursor")