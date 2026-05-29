package ch.ethy.recipes.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginCredentials(
    @NotBlank @Size(max = 256) String usernameOrEmail,
    @NotBlank @Size(max = 256) String password) {}
