package ch.ethy.recipes.admin;

import jakarta.validation.constraints.NotNull;

/**
 * Admin request body for changing a single user. Currently carries only the enabled flag; role and
 * further editable fields join it in later slices. {@code enabled} is required so an omitted field
 * is a 400 rather than a silent default.
 */
public record UserUpdateRequest(@NotNull Boolean enabled) {}
