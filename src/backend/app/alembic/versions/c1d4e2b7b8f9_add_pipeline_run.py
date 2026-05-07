"""Add pipeline run

Revision ID: c1d4e2b7b8f9
Revises: 8d831eabbe4c
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'c1d4e2b7b8f9'
down_revision = '8d831eabbe4c'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pipelinerun',
        sa.Column('pipeline_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('trigger', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('current_step', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('celery_task_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('total_items', sa.Integer(), nullable=True),
        sa.Column('processed_items', sa.Integer(), nullable=False),
        sa.Column('skipped_items', sa.Integer(), nullable=False),
        sa.Column('failed_items', sa.Integer(), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pipelinerun_celery_task_id'), 'pipelinerun', ['celery_task_id'], unique=False)
    op.create_index(op.f('ix_pipelinerun_current_step'), 'pipelinerun', ['current_step'], unique=False)
    op.create_index(op.f('ix_pipelinerun_id'), 'pipelinerun', ['id'], unique=False)
    op.create_index(op.f('ix_pipelinerun_pipeline_name'), 'pipelinerun', ['pipeline_name'], unique=False)
    op.create_index(op.f('ix_pipelinerun_status'), 'pipelinerun', ['status'], unique=False)
    op.create_index(op.f('ix_pipelinerun_trigger'), 'pipelinerun', ['trigger'], unique=False)
    op.create_index(op.f('ix_pipelinerun_uuid'), 'pipelinerun', ['uuid'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_pipelinerun_uuid'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_trigger'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_status'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_pipeline_name'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_id'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_current_step'), table_name='pipelinerun')
    op.drop_index(op.f('ix_pipelinerun_celery_task_id'), table_name='pipelinerun')
    op.drop_table('pipelinerun')