FROM eclipse-temurin:25.0.3_9-jre@sha256:5cf92df78f6dba978777d5cffa3c856e583f86814fde82a6c3534ccdfd794f2f

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
