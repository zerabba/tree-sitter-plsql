module.exports = grammar({
  name: 'plsql',

  extras: $ => [
    /\s\n/,
    /\s/,
    $.comment,
    $.marginalia,
  ],


  conflicts: $ => [
    [$.select_only_statement, $.subquery_basic_elements],
  ],

  word: $ => $._identifier,

  rules: {
    program: $ => seq(
      repeat(
        seq(
          choice(
            $.statement,
          ),
          '/',
        ),
      ),
      // optionally, a single statement without a terminating ;
      optional(
        $.statement,
      ),
    ),

    statement: $ => choice(
      $._ddl_statement,
    ),

    _ddl_statement: $ => choice(
      $.create_package_header,
      $.create_package_body,
      $.create_synonym,
    ),

    create_package_header: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kPackage,
      $.package_name,
      choice($.kIs, $.kAs),
      repeat(
        choice(
          $.pragma_declaration,
          $.variable_declaration,
          $.subtype_declaration,
          $.cursoor_declaration,
          $.function_specification,
          $.procedure_specification,
        ),
      ),
      $.kEnd,
      optional($._identifier),
      optional(';')
    ),

    pragma_declaration: $ => seq(
      $.kPragma,
      choice(
        $.kSeriallyReusable,
        $.kAutonomousTransaction,
        seq($.kExceptionInit, '(',
            field("name", $.identifier),
            ',',
            $._negative_decimal_number,
            ')',
           ),
        seq($.kInline, '(',
            field("name", $.identifier),
            ',',
            choice($.kStrYes, $.kStrNo),
            ')',
           ),
        seq($.kRestrictReferences, '(',
            field("name", $.identifier),
            commaSep1(choice($.kRNDS, $.kWNDS, $.kRNPS, $.kWNPS, $.kTRUST)),
            ')',
           ),
      ),
      ';',
    ),

    variable_declaration: $ => seq(
      $.identifier,
      optional($.kConstant),
      $.type_spec,
      optional(seq($.kNot, $.kNull)),
      optional($.default_value_part),
      ';',
    ),

    subtype_declaration: $ => seq(
      $.kSubType,
      $.identifier,
      $.kIs,
      $.type_spec,
      optional(seq($.kRange, $.expression, '..', $.expression)),
      optional(seq($.kNot, $.kNull)),
      ';',
    ),

    dml_table_expression_clause: $ => choice(
      $.table_collection_expression,
      wrapped_in_parenthesis(seq($.select_statement, optional($.subquery_restriction_clause))),
      seq($.tableview_name, optional($.sample_clause)),
    ),

    table_collection_expression: $ => prec.left(
      seq(
        choice($.kTable, $.kThe),
        choice(wrapped_in_parenthesis($.subquery), wrapped_in_parenthesis($.expression)),
        optional($.outer_join_sign),
      ),
    ),

    subquery_restriction_clause: $ => seq(
      $.kWith,
      choice(
        seq($.kRead, $.kOnly),
        seq($.kCheck, $.kOption, optional(seq($.kConstraint, field("name", $.identifier)))),
      ),
    ),

    sample_clause: $ => seq(
      $.kSample,
      optional($.kBlock),
      wrapped_in_parenthesis(commaSep1($.expression)),
      optional($.seed_part),
    ),

    seed_part: $ => seq(
      $.kSeed,
      wrapped_in_parenthesis($.expression),
    ),

    cursoor_declaration: $ => seq(
      $.kCursor,
      field("name", $.identifier),
      optional(wrapped_in_parenthesis(commaSep1($.parameter_spec))),
      $.kIs,
      $.select_statement,
      ';',
    ),

    where_clause: $ => seq(
      $.kWhere,
      choice(
        seq($.kCurrent, $.kOf, $.cursor_name),
        $.expression,
      ),
    ),

    into_clause: $ => seq(
      optional(seq($.kBulk, $.kCollect)),
      $.kInto,
      commaSep1($.variable_name),
    ),


    select_only_statement: $ => seq(
      optional($.subquery_factoring_clause),
      $.subquery,
    ),

    select_statement: $ => seq(
      $.select_only_statement,
      repeat(
        choice(
          $.for_update_clause,
          $.order_by_clause,
          $.offset_clause,
          $.fetch_clause,
        ),
      ),
    ),

    subquery_factoring_clause: $ => seq(
      $.kWith,
      commaSep1($.factoring_element),
    ),

    factoring_element: $ => seq(
      field('name', $.identifier),
      optional($.paren_column_list),
      $.kAs,
      wrapped_in_parenthesis(seq($.subquery, optional($.order_by_clause))),
      optional($.search_clause),
      optional($.cycle_clause),
    ),

    search_clause: $ => seq(
      $.kSearch,
      choice($.kDepth, $.kBreadth),
      $.kFirst,
      $.kBy,
      commaSep1(
        $.column_name,
        optional($.kAsc),
        optional($.kDesc),
        optional(seq($.kNulls, choice($.kFirst, $.kLast))),
      ),
      $.kSet,
      $.column_name,
    ),

    cycle_clause: $ => seq(
      $.kCycle,
      $.column_list,
      $.kSet,
      $.column_name,
      $.kTo,
      $.expression,
      $.kDefault,
      $.expression,
    ),

    subquery: $ => seq(
      $.subquery_basic_elements,
      optional($.subquery_operation_part),
    ),

    subquery_basic_elements: $ => choice(
      $.query_block,
      wrapped_in_parenthesis($.subquery),
    ),

    subquery_operation_part: $ => seq(
      choice(seq($.kUnion, optional($.kAll)), $.kIntersect, $.kMinus),
      $.subquery_basic_elements,
    ),

    query_block: $ => prec.left(
      seq(
        $.kSelect,
        optional(choice($.kDistinct, $.kUnique, $.kAll)),
        $.select_list,
        optional($.into_clause),
        $.from_clause,
        optional($.where_clause),
        optional($.hierarchical_query_clause),
        optional($.group_by_clause),
        optional($.model_clause),
        optional($.order_by_clause),
        optional($.fetch_clause),
      ),
    ),

    select_list: $ => choice(
      "*",
      commaSep1($.select_list_elements),
    ),

    from_clause: $ => seq(
      $.kFrom,
      $.table_ref_list
    ),

    select_list_elements: $ => choice(
      seq($.tableview_name, ".", "*"),
      seq($.expression, optional($.column_alias)),
    ),

    table_ref_list: $ => prec.left(commaSep1($.table_ref)),

    table_ref: $ => prec.left(
      seq(
        $.table_ref_aux,
        optional($.join_clause),
        optional(choice($.pivot_clause, $.unpivot_clause)),
      ),
    ),

    table_ref_aux: $ => prec.left(
      seq(
        $.table_ref_aux_internal,
        optional($.flashback_query_clause),
        optional(field("table_alias", $.identifier)),
      ),
    ),

    table_ref_aux_internal: $ => prec.left(
      choice(
        seq($.dml_table_expression_clause, optional(choice($.pivot_clause, $.unpivot_clause))),
        seq(wrapped_in_parenthesis(seq($.table_ref, optional($.subquery_operation_part)), optional(choice($.pivot_clause, $.unpivot_clause)))),
        seq($.kOnly, wrapped_in_parenthesis($.dml_table_expression_clause)),
      ),
    ),

    join_clause: $ => prec.left(
      seq(
        optional($.query_partition_clause),
        optional(choice($.kCross, $.kNatural)),
        optional(choice($.kInner, $.outer_join_type)),
        $.kJoin,
        $.table_ref_aux,
        optional($.query_partition_clause),
        repeat(choice($.join_on_part, $.join_using_part)),
      ),
    ),

    join_on_part: $ => seq(
      $.kOn,
      $.condition,
    ),

    join_using_part: $ => seq(
      $.kUsing,
      $.paren_column_list,
    ),

    outer_join_type: $ => seq(
      choice($.kLeft, $.kRight, $.kFull),
      optional($.kOuter),
    ),

    query_partition_clause: $ => seq(
      $.kPartition,
      $.kBy,
      choice(
        wrapped_in_parenthesis(choice($.subquery, $.expressions_)),
        $.expressions_
      ),
    ),

    flashback_query_clause: $ => choice(
      seq($.kVersions, $.kBetween, choice($.kScn, $.kTimestamp), $.expression),
      seq($.kAs, $.kOf, choice($.kScn, $.kTimestamp, $.kSnapshot), $.expression),
    ),

    pivot_clause: $ => seq(
      $.kPivot,
      optional($.kXml),
      wrapped_in_parenthesis(seq(commaSep1($.pivot_element), $.pivot_for_clause, $.pivot_in_clause)),
    ),

    pivot_element: $ => seq(
      field("aggregate_function_name", $.identifier),
      wrapped_in_parenthesis($.expression),
      optional($.column_alias),
    ),

    pivot_for_clause: $ => seq(
      $.kFor,
      choice($.column_name, $.paren_column_list),
    ),

    pivot_in_clause: $ => seq(
      $.kIn,
      wrapped_in_parenthesis(
        choice(
          $.subquery,
          commaSep1($.kAny),
          commaSep1($.pivot_in_clause_element),
        ),
      ),
    ),

    pivot_in_clause_element: $ => seq(
      $.pivot_in_clause_elements,
      optional($.column_alias),
    ),

    pivot_in_clause_elements: $ => choice(
      $.expression,
      wrapped_in_parenthesis($.expressions_),
    ),

    unpivot_clause: $ => seq(
      $.kUnpivot,
      optional(seq(choice($.kInclude, $.kExclude), $.kNulls)),
      wrapped_in_parenthesis(seq(choice($.column_name, $.paren_column_list), $.pivot_for_clause, $.unpivot_in_clause)),
    ),

    unpivot_in_clause: $ => seq(
      $.kIn,
      wrapped_in_parenthesis(commaSep1($.unpivot_in_elements)),
    ),

    unpivot_in_elements: $ => seq(
      choice($.column_name, $.paren_column_list),
      optional(
        seq(
          $.kAs,
          choice(
            $.constant,
            wrapped_in_parenthesis(commaSep1($.constant)),
          ),
        ),
      ),
    ),

    hierarchical_query_clause: $ => choice(
      seq($.kConnect, $.kBy, optional($.kNoCycle), $.condition, optional($.start_part)),
      seq($.start_part, $.kConnect, $.kBy, optional($.kNoCycle), $.condition),
    ),

    start_part: $ => seq(
      $.kStart,
      $.kWith,
      $.condition,
    ),

    group_by_clause: $ => prec.left(
      choice(
        seq($.kGroup, $.kBy, commaSep1($.group_by_elements), optional($.having_clause)),
        seq($.having_clause, optional(seq($.kGroup, $.kBy, commaSep1($.group_by_elements)))),
      ),
    ),

    group_by_elements: $ => choice(
      $.grouping_sets_clause,
      $.rollup_cube_clause,
      $.expression,
    ),

    rollup_cube_clause: $ => seq(
      choice($.kRollup, $.kCube),
      wrapped_in_parenthesis(commaSep1($.grouping_sets_elements)),
    ),

    grouping_sets_clause: $ => seq(
      $.kGrouping,
      $.kSets,
      wrapped_in_parenthesis(commaSep1($.grouping_sets_elements)),
    ),

    grouping_sets_elements: $ => choice(
      $.rollup_cube_clause,
      wrapped_in_parenthesis($.expressions_),
      $.expression,
    ),

    having_clause: $ => seq(
      $.kHaving,
      $.condition,
    ),

    model_clause: $ => seq(
      $.kModel,
      repeat($.cell_reference_options),
      optional($.return_rows_clause),
      repeat($.reference_model),
      $.main_model,
    ),

    cell_reference_options: $ => choice(
      seq(choice($.kIgnore, $.kKeep), $.kNav),
      seq($.kUnique, choice($.kDimension, seq($.kSingle, $.kReference))),
    ),

    return_rows_clause: $ => seq(
      $.kReturn,
      choice($.kUpdated, $.kAll),
      $.kRows,
    ),

    reference_model: $ => seq(
      $.kReference,
      field("name", $.identifier),
      $.kOn,
      wrapped_in_parenthesis($.subquery),
      $.model_column_clauses,
      repeat($.cell_reference_options),
    ),

    main_model: $ => seq(
      optional(seq($.kMain, field("name", $.identifier))),
      $.model_column_clauses,
      repeat($.cell_reference_options),
      $.model_rules_clause,
    ),

    model_column_clauses: $ => seq(
      optional($.model_column_partition_part),
      $.kDimension,
      $.kBy,
      $.model_colun_list,
      $.kMeasures,
      $.model_colun_list,
    ),

    model_column_partition_part: $ => seq(
      $.kPartition,
      $.kBy,
      $.model_colun_list,
    ),

    model_colun_list: $ => commaSep1($.model_column),

    model_column: $ => seq(
      choice($.expression, $.query_block),
      optional($.column_alias),
    ),

    model_rules_clause: $ => seq(
      optional($.model_rules_part),
      wrapped_in_parenthesis(optional(commaSep1($.model_rules_element))),
    ),

    model_rules_part: $ => seq(
      $.kRules,
      optional(choice($.kUpdate, seq($.kUpsert, optional($.kAll)))),
      optional(seq(choice($.kAutomatic, $.kSequential), $.kOrder)),
      optional($.model_iterate_clause),
    ),

    model_iterate_clause: $ => seq(
      $.kIterate,
      wrapped_in_parenthesis($.expression),
      optional($.until_part),
    ),

    until_part: $ => seq(
      $.kUntil,
      wrapped_in_parenthesis($.condition),
    ),

    model_rules_element: $ => seq(
      optional(choice($.kUpdate, seq($.kUpsert, optional($.kAll)))),
      $.cell_assignment,
      optional($.order_by_clause),
      '=',
      $.expression,
    ),

    cell_assignment: $ => seq(
      $.model_expression,
    ),

    model_expression: $ => seq(
      $.unary_expression,
      optional(seq('[', $.model_expression_element, ']')),
    ),

    model_expression_element: $ => choice(
      commaSep1(choice($.kAny, $.expression)),
      commaSep1($.single_column_for_loop),
      $.multi_column_for_loop,
    ),

    single_column_for_loop: $ => seq(
      $.kFor,
      $.column_name,
      choice(
        seq($.kIn, wrapped_in_parenthesis(optional($.expressions_))),
        seq(optional(seq($.kLike, $.expression)), $.kFrom, field("from_expr", $.expression), $.kTo, field("to_expr", $.expression)),
      ),
      field("action_expr", $.expression),
    ),

    multi_column_for_loop: $ => seq(
      $.kFor,
      $.paren_column_list,
      $.kIn,
      wrapped_in_parenthesis(choice($.subquery, wrapped_in_parenthesis(optional($.expressions_)))),
    ),

    unary_expression: $ => choice(
      seq(choice('-', '+'), $.unary_expression),
      //TODO: add more unary expressions
    ),

    until_part: $ => seq(
      $.kUntil,
      wrapped_in_parenthesis($.condition),
    ),

    order_by_clause: $ => prec.left(
      seq(
        $.kOrder,
        optional($.kSiblings),
        $.kBy,
        commaSep1($.order_by_elements),
      ),
    ),

    order_by_elements: $ => seq(
      $.expression,
      optional(choice($.kAsc, $.kDesc)),
      optional(seq($.kNulls, choice($.kFirst, $.kLast))),
    ),

    offset_clause: $ => seq(
      $.kOffset,
      $.expression,
      choice($.kRow, $.kRows),
    ),

    fetch_clause: $ => seq(
      $.kFetch,
      choice($.kFirst, $.kNext),
      seq($.expression, optional($.kPercent)),
      choice($.kRow, $.kRows),
      choice($.kOnly, $.kWith, $.kTies),
    ),

    for_update_clause: $ => seq(
      $.kFor,
      $.kUpdate,
      optional($.for_update_of_part),
      optional($.for_update_options),
    ),

    for_update_of_part: $ => seq(
      $.kOf,
      $.column_list,
    ),

    for_update_options: $ => choice(
      seq($.kSkip, $.kLocked),
      seq($.kWait, $.expression),
      $.kNowait,
    ),

    column_alias: $ => choice(
      $.kAs,
      seq(optional($.kAs), $.identifier),
    ),

    condition: $ => seq(
      $.expression,
    ),

    expressions_: $ => prec.left(commaSep1($.expression)),

    paren_column_list: $ => wrapped_in_parenthesis($.column_list),

    column_list: $ => commaSep1($.column_name),
    column_name: $ => field('name', $.identifier),

    parameter_spec: $ => seq(
      field('name', $.identifier),
      optional(seq(optional($.kIn), $.type_spec)),
      optional($.default_value_part),
    ),

    default_value_part: $ => seq(
      choice($.kDefault, ":="),
      $.expression,
    ),

    function_specification: $ => seq(
      $.kFunction,
      field('name', $.identifier),
      optional($.parameter_list),
      $.return_type,
      optional($.kPipelined),
      optional($.kDeterministic),
      optional($.kResultCache),
      ';',
    ),

    keep_clause: $ => seq(
      $.kKeep,
      wrapped_in_parenthesis(
        seq(
          $.kDenseRank,
          choice($.kFirst, $.kLast),
          $.order_by_clause,
        ),
      ),
      optional($.over_clause),
    ),

    over_clause: $ => seq(
      $.kOver,
      wrapped_in_parenthesis(
        seq(
          optional($.query_partition_clause),
          optional(seq($.order_by_clause, optional($.windowing_clause))),
        ),
      ),
    ),

    windowing_clause: $ => seq(
      choice($.kRows, $.kRange),
      choice(
        seq(
          $.kBetween,
          $.windowing_elements,
          $.kAnd,
          $.windowing_elements,
        ),
        $.windowing_elements,
      ),
    ),

    windowing_elements: $ => choice(
      seq($.kUnbounded, $.kPreceding),
      seq($.kCurrent, $.kRow),
      seq($.concatenation, $.kPreceding),
      seq($.concatenation, $.kFollowing),
    ),

    function_argument: $ => prec.left(
      seq(
        wrapped_in_parenthesis(commaSep1($.argument)),
        optional($.keep_clause),
      ),
    ),

    argument: $ => seq(
      optional(
        seq(
          field('name', $.identifier),
          '=',
          '>',
        ),
      ),
      $.expression,
    ),

    procedure_specification: $ => seq(
      $.kProcedure,
      field('name', $.identifier),
      optional($.parameter_list),
      ';',
    ),

    constant: $ => choice(
      $.kNull,
      $.kDefault,
      $.kTrue,
      $.kFalse,
      //TODO: add more constants
    ),

    variable_name: $ => choice(
      seq(optional(seq($.kIntroducer, field("char_set_name", $.identifier))), $.identifier),
      $.bind_variable,
    ),

    cursor_name: $ => choice(
      $.general_element,
      $.bind_variable,
    ),

    tableview_name: $ => prec.left(
      choice(
        seq(
          $.identifier,
          optional(seq('@', field("link_name", $.identifier), optional(seq('.', field("link_name", $.identifier))))),
        ),
        seq($.xmltable, optional($.outer_join_sign)),
      ),
    ),

    xmltable: $ => prec.left(
      seq(
        $.kXmlTable,
        wrapped_in_parenthesis(seq(
          optional(seq($.xml_namespace_clause, ',')),
          $.concatenation,
          optional($.xml_passing_clause),
          optional(seq($.kColumns, commaSep1($.xml_table_column))),
        )),
        optional(seq('.', $.general_element_part)),
      ),
    ),

    xml_passing_clause: $ => seq(
      $.kPassing,
      optional(seq($.kBy, $.kValue)),
      commaSep1(seq($.expression, optional($.column_alias))),
    ),

    xml_table_column: $ => seq(
      field('name', $.identifier),
      choice(
        seq($.kFor, $.kOrdinality),
        seq($.type_spec, optional(seq($.kPath, $.concatenation)))
      ),
      optional($.xml_general_default_part),
    ),

    xml_general_default_part: $ => seq(
      $.kDefault,
      $.concatenation,
    ),


    xml_namespace_clause: $ => seq(
      $.kXmlNamespaces,
      wrapped_in_parenthesis(seq(commaSep1(seq($.concatenation, $.column_alias)), optional($.xml_general_default_part))),
    ),

    xml_general_default_part: $ => seq(
      $.kDefault,
      $.concatenation,
    ),

    concatenation: $ => prec.left(
      choice(
        seq($.concatenation, '||', $.concatenation),
        //TODO: add more concatenation types
      ),
    ),

    parameter_list: $ => seq(
      '(',
      repeat(
        seq(
          $.parameter,
          ',',
        ),
      ),
      $.parameter,
      ')',
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      optional(
        choice(
          $.kIn,
          $.kOut,
          $.kInOut,
          $.kNoCopy,
        ),
      ),
      $.type_spec,
      optional($.default_value_part),
    ),

    return_type: $ => seq(
      $.kReturn,
      $.type_spec,
    ),

    type_spec: $ => choice(
      $.datatype,
      seq(
        optional($.kRef),
        sep1($.identifier, '.'),
        optional(seq('%', choice($.kType, $.kRowType)))
      ),
    ),

    // TODO: add more data types
    datatype: $ => choice(
      $.char,
      $.varchar2,
      $.number,
      $.kDate,
    ),

    bind_variable: $ => seq(
      ':',
      $.identifier,
      //TODO: check if this is correct
    ),

    general_element: $ =>  sep1($.general_element_part, '.'),

    general_element_part: $ => prec.left(
      seq(
        optional(seq($.kIntroducer, field("char_set_name", $.identifier))),
        $.identifier,
        optional(seq('@', field("link_name", $.identifier))),
        optional($.function_argument),
      ),
    ),

    // TODO: add more expressions
    expression: $ => choice(
      $.literal,
    ),

    row_type: $ => seq(
      optional(seq(field('schema', $.identifier), '.')),
      field('table', $.identifier),
      '.',
      field('column', $.identifier),
      '%',
      $.kType,
    ),

    create_package_body: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kPackage,
      $.kBody,
      $.package_name,
      choice($.kIs, $.kAs),
      repeat(
        $.comment,
      ),
      $.kEnd,
      optional($._identifier),
      optional(';')
    ),

    create_synonym: $ => seq(
      $.kCreate,
      optional($._or_replace),
      $.kSynonym,
      $.identifier,
      $.kFor,
      $.synonym_target,
      optional(';')
    ),

    synonym_target: $ => seq(
      optional(seq(field('schema', $.identifier), '.')),
      $.identifier,
    ),

    package_name: $ =>
    seq(
      optional(seq(field('schema', $.identifier), '.')),
      $.identifier,
    ),

    _or_replace: $ => seq($.kOr, $.kReplace),

    kCreate: _ => make_keyword("CREATE"),
    kOr: _ => make_keyword("OR"),
    kReplace: _ => make_keyword("REPLACE"),
    kPackage: _ => make_keyword("PACKAGE"),
    kBody: _ => make_keyword("BODY"),
    kIs: _ => make_keyword("IS"),
    kAs: _ => make_keyword("AS"),
    kFor: _ => make_keyword("FOR"),
    kEnd: _ => make_keyword("END"),
    kSynonym: _ => make_keyword("SYNONYM"),
    kFunction: _ => make_keyword("FUNCTION"),
    kPipelined: _ => make_keyword("PIPELINED"),
    kDeterministic: _ => make_keyword("DETERMINISTIC"),
    kResultCache: _ => make_keyword("RESULT_CACHE"),
    kProcedure: _ => make_keyword("PROCEDURE"),
    kIn: _ => make_keyword("IN"),
    kInOut: _ => make_keyword("IN OUT"),
    kOut: _ => make_keyword("OUT"),
    kReturn: _ => make_keyword("RETURN"),
    kType: _ => make_keyword("TYPE"),
    kNumber: _ => make_keyword("NUMBER"),
    kChar: _ => make_keyword("CHAR"),
    kVarchar2: _ => make_keyword("VARCHAR2"),
    kDate: _ => make_keyword("DATE"),
    kDefault: _ => make_keyword("DEFAULT"),
    kConstant: _ => make_keyword("CONSTANT"),
    kNot: _ => make_keyword("NOT"),
    kTrue: _ => make_keyword("TRUE"),
    kFalse: _ => make_keyword("FALSE"),
    kNull: _ => make_keyword("NULL"),
    kNoCopy: _ => make_keyword("NOCOPY"),
    kExceptionInit: _ => make_keyword("EXCEPTION_INIT"),
    kSeriallyReusable: _ => make_keyword("SERIALLY_REUSABLE"),
    kAutonomousTransaction: _ => make_keyword("AUTONOMOUS_TRANSACTION"),
    kPragma: _ => make_keyword("PRAGMA"),
    kStrYes: _ => make_keyword("'YES'"),
    kStrNo: _ => make_keyword("'NO'"),
    kInline: _ => make_keyword("INLINE"),
    kRestrictReferences: _ => make_keyword("RESTRICT_REFERENCES"),
    kRNDS: _ => make_keyword("RNDS"),
    kWNDS: _ => make_keyword("WNDS"),
    kRNPS: _ => make_keyword("RNPS"),
    kWNPS: _ => make_keyword("WNPS"),
    kTRUST: _ => make_keyword("TRUST"),
    kSubType: _ => make_keyword("SUBTYPE"),
    kRange: _ => make_keyword("RANGE"),
    kCursor: _ => make_keyword("CURSOR"),
    kWith: _ => make_keyword("WITH"),
    kDepth: _ => make_keyword("DEPTH"),
    kBreadth: _ => make_keyword("BREADTH"),
    kAsc: _ => make_keyword("ASC"),
    kDesc: _ => make_keyword("DESC"),
    kFirst: _ => make_keyword("FIRST"),
    kLast: _ => make_keyword("LAST"),
    kNulls: _ => make_keyword("NULLS"),
    kSearch: _ => make_keyword("SEARCH"),
    kBy: _ => make_keyword("BY"),
    kSet: _ => make_keyword("SET"),
    kCycle: _ => make_keyword("CYCLE"),
    kTo: _ => make_keyword("TO"),
    kAll: _ => make_keyword("ALL"),
    kUnion: _ => make_keyword("UNION"),
    kIntersect: _ => make_keyword("INTERSECT"),
    kMinus: _ => make_keyword("MINUS"),
    kDistinct: _ => make_keyword("DISTINCT"),
    kUnique: _ => make_keyword("UNIQUE"),
    kBulk: _ => make_keyword("BULK"),
    kCollect: _ => make_keyword("COLLECT"),
    kInto: _ => make_keyword("INTO"),
    kCurrent: _ => make_keyword("CURRENT"),
    kOf: _ => make_keyword("OF"),
    kWhere: _ => make_keyword("WHERE"),
    kSelect: _ => make_keyword("SELECT"),
    kFrom: _ => make_keyword("FROM"),
    kTable: _ => make_keyword("TABLE"),
    kThe: _ => make_keyword("THE"),
    kRead: _ => make_keyword("READ"),
    kOnly: _ => make_keyword("ONLY"),
    kConstraint: _ => make_keyword("CONSTRAINT"),
    kCheck: _ => make_keyword("CHECK"),
    kOption: _ => make_keyword("OPTION"),
    kBlock: _ => make_keyword("BLOCK"),
    kSample: _ => make_keyword("SAMPLE"),
    kSeed: _ => make_keyword("SEED"),
    kCross: _ => make_keyword("CROSS"),
    kNatural: _ => make_keyword("NATURAL"),
    kInner: _ => make_keyword("INNER"),
    kJoin: _ => make_keyword("JOIN"),
    kOn: _ => make_keyword("ON"),
    kUsing: _ => make_keyword("USING"),
    kLeft: _ => make_keyword("LEFT"),
    kRight: _ => make_keyword("RIGHT"),
    kFull: _ => make_keyword("FULL"),
    kOuter: _ => make_keyword("OUTER"),
    kPartition: _ => make_keyword("PARTITION"),
    kScn: _ => make_keyword("SCN"),
    kTimestamp: _ => make_keyword("TIMESTAMP"),
    kVersions: _ => make_keyword("VERSIONS"),
    kBetween: _ => make_keyword("BETWEEN"),
    kSnapshot: _ => make_keyword("SNAPSHOT"),
    kXml: _ => make_keyword("XML"),
    kPivot: _ => make_keyword("PIVOT"),
    kAny: _ => make_keyword("ANY"),
    kInclude: _ => make_keyword("INCLUDE"),
    kExclude: _ => make_keyword("EXCLUDE"),
    kUnpivot: _ => make_keyword("UNPIVOT"),
    kNoCycle: _ => make_keyword("NOCYCLE"),
    kConnect: _ => make_keyword("CONNECT"),
    kStart: _ => make_keyword("START"),
    kGroup: _ => make_keyword("GROUP"),
    kRollup: _ => make_keyword("ROLLUP"),
    kCube: _ => make_keyword("CUBE"),
    kGrouping: _ => make_keyword("GROUPING"),
    kSets: _ => make_keyword("SETS"),
    kHaving: _ => make_keyword("HAVING"),
    kModel: _ => make_keyword("MODEL"),
    kIgnore: _ => make_keyword("IGNORE"),
    kKeep: _ => make_keyword("KEEP"),
    kNav: _ => make_keyword("NAV"),
    kSingle: _ => make_keyword("SINGLE"),
    kReference: _ => make_keyword("REFERENCE"),
    kDimension: _ => make_keyword("DIMENSION"),
    kUpdated: _ => make_keyword("UPDATED"),
    kRows: _ => make_keyword("ROWS"),
    kMain: _ => make_keyword("MAIN"),
    kMeasures: _ => make_keyword("MEASURES"),
    kUpsert: _ => make_keyword("UPSERT"),
    kUpdate: _ => make_keyword("UPDATE"),
    kAutomatic: _ => make_keyword("AUTOMATIC"),
    kSequential: _ => make_keyword("SEQUENTIAL"),
    kOrder: _ => make_keyword("ORDER"),
    kRules: _ => make_keyword("RULES"),
    kIterate: _ => make_keyword("ITERATE"),
    kUntil: _ => make_keyword("UNTIL"),
    kLike: _ => make_keyword("LIKE"),
    kSiblings: _ => make_keyword("SIBLINGS"),
    kRow: _ => make_keyword("ROW"),
    kOffset: _ => make_keyword("OFFSET"),
    kNext: _ => make_keyword("NEXT"),
    kPercent: _ => make_keyword("PERCENT"),
    kTies: _ => make_keyword("TIES"),
    kFetch: _ => make_keyword("FETCH"),
    kSkip: _ => make_keyword("SKIP"),
    kLocked: _ => make_keyword("LOCKED"),
    kWait: _ => make_keyword("WAIT"),
    kNowait: _ => make_keyword("NOWAIT") ,
    kIntroducer: _ => make_keyword("INTRODUCER"),
    kColumns: _ => make_keyword("COLUMNS"),
    kXmlTable: _ => make_keyword("XMLTABLE"),
    kValue: _ => make_keyword("VALUE"),
    kPassing: _ => make_keyword("PASSING"),
    kOrdinality: _ => make_keyword("ORDINALITY"),
    kPath: _ => make_keyword("PATH"),
    kXmlNamespaces: _ => make_keyword("XMLNAMESPACES"),
    kDenseRank: _ => make_keyword("DENSE_RANK"),
    kOver: _ => make_keyword("OVER"),
    kAnd: _ => make_keyword("AND"),
    kUnbounded: _ => make_keyword("UNBOUNDED"),
    kPreceding: _ => make_keyword("PRECEDING"),
    kFollowing: _ => make_keyword("FOLLOWING"),
    kRef: _ => make_keyword("REF"),
    kRowType: _ => make_keyword("ROWTYPE"),



    char: $ => parametric_type($, $.kChar),
    varchar2: $ => parametric_type($, $.kVarchar2),
    number: $ => parametric_type($, $.kNumber, ['precision', 'scale']),

    outer_join_sign: $ => seq('(', '+', ')'),

    literal: $ => prec(2,
      choice(
        $._integer,
        $._decimal_number,
        $._literal_string,
        // $._bit_string,
        // $._string_casting,
        $.kTrue,
        $.kFalse,
        $.kNull,
      ),
    ),

    comment: _ => /--.*/,
    // https://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment
    marginalia: _ => /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//,

    _double_quote_string: _ => /"[^"]*"/,

    _single_quote_string: _ => seq(/([uU]&)?'([^']|'')*'/, repeat(/'([^']|'')*'/)),
    _literal_string: $ => prec(
      1,
      choice(
        $._single_quote_string,
        $._double_quote_string,
        // $._dollar_quoted_string,
      ),
    ),

    _natural_number: _ => /\d+/,
    _integer: $ => seq(
      optional(choice("-", "+")),
      /(0[xX][0-9A-Fa-f]+(_[0-9A-Fa-f]+)*)|(0[oO][0-7]+(_[0-7]+)*)|(0[bB][01]+(_[01]+)*)|(\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)/
    ),
    _negative_decimal_number: $ => seq(
      "-",
      /((\d+(_\d+)*)?[.]\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)|(\d+(_\d+)*[.](e[+-]?\d+(_\d+)*)?)/
    ),
    _decimal_number: $ => seq(
      optional(
        choice("-", "+")),
      /((\d+(_\d+)*)?[.]\d+(_\d+)*(e[+-]?\d+(_\d+)*)?)|(\d+(_\d+)*[.](e[+-]?\d+(_\d+)*)?)/
    ),

    identifier: $ => choice(
      $._identifier,
      $._double_quote_string,
      /`([a-zA-Z_][0-9a-zA-Z_]*)`/,
    ),
    _identifier: _ => /[a-zA-Z_][0-9a-zA-Z_]*/,
  }
});

function commaSep1(rule) {
  return sep1(rule, ",");
}

function commaSep(rule) {
  return optional(sep1(rule, ","));
}

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function wrapped_in_parenthesis(node) {
  if (node) {
    return seq("(", node, ")");
  }
  return seq("(", ")");
}

function parametric_type($, type, params = ['size']) {
  return prec.right(1,
    choice(
      type,
      seq(
        type,
        wrapped_in_parenthesis(
          seq(
            // first parameter is guaranteed, shift it out of the array
            field(params.shift(), alias($._natural_number, $.literal)),
            // then, fill in the ", next" until done
            ...params.map(p => seq(',', field(p, alias($._natural_number, $.literal)))),
          ),
        ),
      ),
    ),
  )
}

function make_keyword(word) {
  str = "";
  for (var i = 0; i < word.length; i++) {
    str = str + "[" + word.charAt(i).toLowerCase() + word.charAt(i).toUpperCase() + "]";
  }
  return new RegExp(str);
}
