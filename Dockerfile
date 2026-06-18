FROM eclipse-temurin:26.0.1_8-jre@sha256:35b73bd200009a35648e557e9bb61bf71aba9066ccccd6ff6a94ce58be0b91e7

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
