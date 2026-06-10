# 2. Constraints

## 2.1 Technical Constraints

| Constraint | Explanation |
|---|---|
| Java / Spring Boot | Backend runtime and framework |
| Angular | Frontend SPA framework |
| MySQL | Relational database for persistence |
| Single deployable | Frontend is built into the Spring Boot JAR and served as static resources |
| JWT authentication | Stateless authentication; no server-side session store |

## 2.2 Organizational Constraints

| Constraint | Explanation |
|---|---|
| Single developer | Architecture must remain simple; no microservices overhead |
| Self-hosted | The application runs on private infrastructure |
