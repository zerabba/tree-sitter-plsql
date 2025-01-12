#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include <stdint.h>

// token types must correpsond to externals array in grammar.js
enum TokenType {
    PERL_QUOTED_STRING,
    ERROR_SENTINEL
};

void * tree_sitter_plsql_external_scanner_create() 
{
    return NULL;
}

void tree_sitter_plsql_external_scanner_destroy(void *scanner) 
{
    (void)scanner;
}

unsigned tree_sitter_plsql_external_scanner_serialize(void *scanner, char *buffer) 
{
    // max TREE_SITTER_SERIALIZATION_BUFFER_SIZE bytes to write
    (void)scanner;
    (void)buffer;
    return 0;
}

void tree_sitter_plsql_external_scanner_deserialize(void *scanner, const char *buffer, unsigned length)
{
    (void)scanner;
    (void)buffer;
    (void)length;
}

void skip_whitespace(TSLexer *lexer)
{
    // seems there is no way to refer to whitespace as define in grammar.js - we have to duplicate the info here
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' || lexer->lookahead == '\r' || lexer->lookahead == '\n') {
        lexer->advance(lexer, true);
    }
}

bool tree_sitter_plsql_external_scanner_scan(void *scanner, TSLexer *lexer, const bool *valid_symbols)
{
    if (valid_symbols[ERROR_SENTINEL]) return false;  // in error recovery mode
    
    // alternative quoted string as to https://livesql.oracle.com/ords/livesql/file/content_CIREYU9EA54EOKQ7LAMZKRF6P.html
    if (valid_symbols[PERL_QUOTED_STRING]) {
        // whitespace is not skipped by tree-sitter itself, 
        skip_whitespace(lexer);
        
        if (lexer->lookahead != 'q' && lexer->lookahead != 'Q') return false;
        lexer->advance(lexer, false); // to single quote
        
        if (lexer->lookahead != '\'') return false;
        lexer->advance(lexer, false); // to opening char
        
        uint32_t start_char = lexer->lookahead;
        uint32_t end_char = start_char;
        if (start_char == ' ') return false;  // space is forbidden. TODO: check if other whitespace character are also forbidden
        if (start_char == '(') end_char = ')'; // paired chars
        if (start_char == '[') end_char = ']';
        if (start_char == '{') end_char = '}';
        if (start_char == '<') end_char = '>';
        lexer->advance(lexer, false); // to first content char or the closing char
        
        // we can assume that before the end quote there will be the closing char (oracle does this), 
        // so we can start memoization from the char after the opening 'bracket'
        uint32_t last_char;
        do {
            last_char = lexer->lookahead;
            lexer->advance(lexer, false);
        } while (!(last_char == end_char && lexer->lookahead == '\'') && !lexer->eof(lexer));
        
        if (lexer->eof(lexer)) return false; // EOF reached before the string was closed
        lexer->advance(lexer, false); // to first char after the closing quote
        
        lexer->mark_end(lexer);
        lexer->result_symbol = PERL_QUOTED_STRING;
        return true;
    }
    
    return false;
}