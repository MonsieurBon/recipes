-- Runs as root during container init (mounted into /docker-entrypoint-initdb.d). Grants the
-- container's application user the elevated privileges production's provisioned recipes-flyway
-- account holds, so the full Flyway chain — including V1's CREATE USER/GRANT — runs unchanged.
GRANT ALL PRIVILEGES ON *.* TO 'test'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
