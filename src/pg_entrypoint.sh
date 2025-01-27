#!/bin/bash

set -e
set -u

function create_user_and_database() {
    local database=$1
    echo "  Creating user and database '$database'"

    # Check if the database exists
    DB_EXISTS=$(psql -U "$POSTGRES_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$database';" | xargs)

    if [ "$DB_EXISTS" != "1" ]; then
        # Database doesn't exist, proceed with creation
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
            CREATE USER $database;
            CREATE DATABASE $database;
            GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
EOSQL
        echo "  Database '$database' created successfully."
    else
        echo "  Database '$database' already exists, skipping creation."
    fi
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created or already existed."
else
    if [ -n "$POSTGRES_DB" ]; then
        create_user_and_database $POSTGRES_DB
    fi
fi
