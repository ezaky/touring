export default class GeoPlaceUtil {
    static normalizePlaceName(input: string): string {
        return input
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "") // strip accents (é -> e, ç -> c)
            .replace(/[-'’./_]+/g, " ")      // turn hyphens, apostrophes, slashes into spaces
            .replace(/[^\p{L}\p{N}\s]+/gu, "") // drop other stray punctuation
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");           // collapse multiple spaces
    }
}