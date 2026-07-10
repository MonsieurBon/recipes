package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class LanguageTest {

  @ParameterizedTest
  @CsvSource({"de,GERMAN", "en,ENGLISH", "fr,FRENCH", "it,ITALIAN"})
  void resolvesEachSupportedCodeToItsConstant(String code, Language expected) {
    assertEquals(Optional.of(expected), Language.fromCode(code));
  }

  @ParameterizedTest
  @CsvSource({"de,GERMAN", "en,ENGLISH", "fr,FRENCH", "it,ITALIAN"})
  void exposesTheWireCodeOfEachConstant(String code, Language language) {
    assertEquals(code, language.code());
  }

  @ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(
      strings = {"", "DE", "de-CH", "es", "gibberish", "<script>"})
  void rejectsAnythingOutsideTheWhitelist(String value) {
    assertTrue(Language.fromCode(value).isEmpty());
  }

  @Test
  void rejectsNull() {
    assertFalse(Language.fromCode(null).isPresent());
  }
}
