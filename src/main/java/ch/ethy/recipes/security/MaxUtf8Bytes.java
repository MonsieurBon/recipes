package ch.ethy.recipes.security;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.nio.charset.StandardCharsets;

/**
 * Validates that a string's UTF-8 encoding does not exceed the given number of bytes.
 *
 * <p>Needed where {@code @Size} is not enough because the downstream limit is in bytes, not
 * characters: BCrypt rejects inputs over 72 bytes, and multibyte characters (umlauts, emoji) hit
 * that ceiling well below 72 characters. Validating the byte length up front turns what would be a
 * 500 from the encoder into a field-level 400.
 *
 * <p>{@code null} values are considered valid; combine with {@code @NotBlank} to require a value.
 */
@Documented
@Constraint(validatedBy = MaxUtf8Bytes.Validator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxUtf8Bytes {

  /** The maximum allowed length of the UTF-8 encoding, in bytes. */
  int value();

  String message() default "must be at most {value} bytes in UTF-8";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};

  /** Checks the UTF-8 byte length of the annotated string against the configured maximum. */
  class Validator implements ConstraintValidator<MaxUtf8Bytes, String> {

    private int maxBytes;

    @Override
    public void initialize(MaxUtf8Bytes constraintAnnotation) {
      this.maxBytes = constraintAnnotation.value();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
      return value == null || value.getBytes(StandardCharsets.UTF_8).length <= maxBytes;
    }
  }
}
