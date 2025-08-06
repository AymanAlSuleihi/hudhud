"""Fix apparatus typo

Revision ID: b32c56862f3d
Revises: 6f57fe13d567
Create Date: 2025-08-05 23:47:47.115105

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
import pgvector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b32c56862f3d'
down_revision = '6f57fe13d567'
branch_labels = None
depends_on = None


def upgrade():
    # Rename column 'aparatus_notes' to 'apparatus_notes' in 'epigraph' table (Alembic compatible)
    op.alter_column('epigraph', 'aparatus_notes', new_column_name='apparatus_notes')


def downgrade():
    # Revert column name 'apparatus_notes' back to 'aparatus_notes' in 'epigraph' table (Alembic compatible)
    op.alter_column('epigraph', 'apparatus_notes', new_column_name='aparatus_notes')
