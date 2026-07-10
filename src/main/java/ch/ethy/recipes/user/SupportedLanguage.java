package ch.ethy.recipes.user;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * Constrains a language wire code to the shipped set (de/en/fr/it), rejecting anything else so an
 * unsupported or crafted value can never be stored. {@code null} passes — presence, where required,
 * is enforced separately with {@code @NotNull} — which lets an optional field (e.g. on
 * registration) fall back to the default when omitted while still rejecting a non-null value
 * outside the list.
 */
@Documented
@Constraint(validatedBy = SupportedLanguageValidator.class)
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
public @interface SupportedLanguage {
  String message() default "must be a supported language";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
