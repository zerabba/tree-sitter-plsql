import XCTest
import SwiftTreeSitter
import TreeSitterPlsql

final class TreeSitterPlsqlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_plsql())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Plsql grammar")
    }
}
