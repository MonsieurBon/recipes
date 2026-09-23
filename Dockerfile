FROM eclipse-temurin:25.0.4_7-jre@sha256:131166eb43967b8496fbb63bb430151a5de9ef5ece383b4aebe6c121da72cc74

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
