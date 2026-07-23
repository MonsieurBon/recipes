package ch.ethy.recipes.user;

import java.util.Set;

public record UserDto(
    long id,
    String username,
    String email,
    boolean enabled,
    Set<Role> roles,
    String preferredLanguage) {}
