FROM eclipse-temurin:27_35-jre@sha256:387922dd341a11a06f39375e6b13f3cb865e09aa409789cd4f7a5a6577cd2290

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
