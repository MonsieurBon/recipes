package ch.ethy.recipes.user;

import java.util.Set;

public record UserDto(long id, String username, String email, Set<Role> roles) {}
