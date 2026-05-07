"""Drop taskprogress

Revision ID: e2f7a9d4c3b1
Revises: c1d4e2b7b8f9
Create Date: 2026-05-07 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = 'e2f7a9d4c3b1'
down_revision = 'c1d4e2b7b8f9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_index(op.f('ix_taskprogress_uuid'), table_name='taskprogress')
    op.drop_index(op.f('ix_taskprogress_id'), table_name='taskprogress')
    op.drop_table('taskprogress')


def downgrade():
    op.create_table(
        'taskprogress',
        sa.Column('task_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('total_items', sa.Integer(), nullable=True),
        sa.Column('processed_items', sa.Integer(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('error', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('uuid', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('skipped_items', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('uuid', 'id')
    )
    op.create_index(op.f('ix_taskprogress_id'), 'taskprogress', ['id'], unique=False)
    op.create_index(op.f('ix_taskprogress_uuid'), 'taskprogress', ['uuid'], unique=True)