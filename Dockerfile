FROM eclipse-temurin:27.0.1.1_4-jre@sha256:9723bc085e2a7bd142b78c9a293427941c309962276d8ef28053a61f73238930

RUN mkdir /opt/app
COPY target/recipes*.jar /opt/app/recipes.jar

CMD ["java", "-jar", "/opt/app/recipes.jar"]
