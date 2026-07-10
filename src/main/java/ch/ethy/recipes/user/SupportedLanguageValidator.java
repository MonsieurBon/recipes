package ch.ethy.recipes.user;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.jspecify.annotations.Nullable;

/** Backs {@link SupportedLanguage} by whitelisting through {@link Language#fromCode(String)}. */
public class SupportedLanguageValidator implements ConstraintValidator<SupportedLanguage, String> {

  @Override
  public boolean isValid(@Nullable String value, ConstraintValidatorContext context) {
    return value == null || Language.fromCode(value).isPresent();
  }
}
