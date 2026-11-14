import Foundation
import CoreText

let fontURL = URL(fileURLWithPath: "/private/tmp/InterVariable.ttf")
guard CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, nil) else {
    fatalError("Inter TTF must be available at /private/tmp/InterVariable.ttf")
}
let font = CTFontCreateWithName("Inter-Regular" as CFString, 16, nil)
let texts = [
    "When an enemy damages you or you dodge, leave a decoy behind. It attracts nearby enemies for a limited time and has its own cooldown.",
    "Discovering a point of interest increases vegetation growth. After you discover several points of interest, receive a random bonus.",
    "Impacts from jaws, beak, leech, spit, and projectile tongue attacks apply poison. The poison deals ability damage once per second."
]
func width(_ text: String) -> Double {
    let attributed = NSAttributedString(string: text, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font])
    return CTLineGetTypographicBounds(CTLineCreateWithAttributedString(attributed), nil, nil, nil)
}
func wrap(_ text: String, maximum: Double) -> [String] {
    var lines: [String] = []
    var line = ""
    for word in text.split(separator: " ").map(String.init) {
        let candidate = line.isEmpty ? word : "\(line) \(word)"
        if !line.isEmpty && width(candidate) > maximum {
            lines.append(line)
            line = word
        } else { line = candidate }
    }
    if !line.isEmpty { lines.append(line) }
    return lines
}
let results = [1366.0, 1280.0].map { viewport -> [String: Any] in
    let shell = min(viewport, 1280.0)
    let padding = max(24.0, min(viewport * 0.04, 60.0))
    let offers = shell - 2 * padding - 148.0 - 36.0
    let columns = (offers - 60.0) / 3.0
    let rows = offers - (55.0 + 190.0 + 80.0 + 45.0)
    return ["viewportWidth": viewport, "columnTextWidth": columns, "rowTextWidth": rows, "columns": texts.map { wrap($0, maximum: columns) }, "rows": texts.map { wrap($0, maximum: rows) }]
}
let result: [String: Any] = ["method": "CoreText Inter Regular 16px word-wrap estimate from layout widths, not a browser capture", "font": CTFontCopyPostScriptName(font) as String, "results": results]
let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
print(String(decoding: data, as: UTF8.self))
