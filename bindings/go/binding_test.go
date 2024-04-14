package tree_sitter_plsql_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-plsql"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_plsql.Language())
	if language == nil {
		t.Errorf("Error loading Plsql grammar")
	}
}
