import secrets
from typing import Any, Dict, List, Optional, Union, cast

from pydantic import AnyHttpUrl, EmailStr, PostgresDsn, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    SERVER_NAME: str
    SERVER_HOST: AnyHttpUrl
    # BACKEND_CORS_ORIGINS is a JSON-formatted list of origins
    # e.g: '["http://localhost", "http://localhost:4200", "http://localhost:3000", \
    # "http://localhost:8080", "http://local.dockertoolbox.tiangolo.com"]'
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    PROJECT_NAME: str
    # SENTRY_DSN: Optional[HttpUrl] = None

    # @validator("SENTRY_DSN", pre=True)
    # def sentry_dsn_can_be_blank(cls, v: str) -> Optional[str]:
    #     if len(v) == 0:
    #         return None
    #     return v

    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
            return v
        values = info.data
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            path=values.get("POSTGRES_DB"),
        )

    # SMTP_TLS: bool = True
    # SMTP_PORT: Optional[int] = None
    # SMTP_HOST: Optional[str] = None
    # SMTP_USER: Optional[str] = None
    # SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None

    # @validator("EMAILS_FROM_NAME")
    # def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
    #     if not v:
    #         return values["PROJECT_NAME"]
    #     return v

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAIL_TEMPLATES_DIR: str = "/app/app/email-templates"
    # EMAILS_ENABLED: bool = False

    # @validator("EMAILS_ENABLED", pre=True)
    # def get_emails_enabled(cls, v: bool, values: Dict[str, Any]) -> bool:
    #     return bool(
    #         values.get("SMTP_HOST")
    #         and values.get("SMTP_PORT")
    #         and values.get("EMAILS_FROM_EMAIL")
    #     )

    EMAIL_TEST_USER: EmailStr = "test@example.com"
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str
    USERS_OPEN_REGISTRATION: bool = False

    OPENAI_API_KEY: str

    OPENSEARCH_USERNAME: str
    OPENSEARCH_PASSWORD: str
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    CELERY_TASK_ALWAYS_EAGER: bool = False
    PIPELINE_NIGHTLY_SYNC_ENABLED: bool = True
    PIPELINE_NIGHTLY_SYNC_HOUR: int = 1
    PIPELINE_NIGHTLY_SYNC_MINUTE: int = 0
    PIPELINE_DEFAULT_RATE_LIMIT_DELAY_SECONDS: float = 10.0
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_MAX_INPUT_TOKENS: int = 8192
    EMBEDDING_MAX_BATCH_INPUTS: int = 2048
    EMBEDDING_MAX_BATCH_TOKENS: int = 300000
    EMBEDDING_PENDING_MAX_AGE_SECONDS: int = 300
    EMBEDDING_PENDING_FLUSH_INTERVAL_SECONDS: int = 60
    EMBEDDING_DEFER_PIPELINE_REQUESTS: bool = True

    @field_validator("CELERY_BROKER_URL", mode="before")
    @classmethod
    def assemble_celery_broker(cls, v: Optional[str], info: ValidationInfo) -> str:
        if isinstance(v, str) and v:
            return v
        return str(info.data.get("REDIS_URL") or "")

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    @classmethod
    def assemble_celery_result_backend(cls, v: Optional[str], info: ValidationInfo) -> str:
        if isinstance(v, str) and v:
            return v
        return str(info.data.get("REDIS_URL") or "")

    DASI_API_URL: str
    DASI_ADDRESS: str
    DASI_INCREMENTAL_LOOKBACK_PAGES: int = 1

    model_config = SettingsConfigDict(case_sensitive=True)


settings = cast(Any, Settings)()
