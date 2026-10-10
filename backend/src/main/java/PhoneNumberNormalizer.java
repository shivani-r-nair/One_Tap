public final class PhoneNumberNormalizer {
    private PhoneNumberNormalizer() { }

    /** Returns E.164-like input with formatting removed, or null when a country code is absent/invalid. */
    public static String normalize(String value) {
        if (value == null) return null;
        String s = value.trim().replaceAll("[\\s().-]", "");
        if (!s.matches("\\+[1-9][0-9]{7,14}")) return null;
        return s;
    }
}
