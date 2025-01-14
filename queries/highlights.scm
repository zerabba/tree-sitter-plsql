;; Keywords
(kPackage) @keyword
(kBody) @keyword
(kIs) @keyword
(kAs) @keyword
(kBegin) @keyword
(kEnd) @keyword
(kFunction) @keyword
(kProcedure) @keyword
(kReturn) @keyword
(kSelect) @keyword
(kFrom) @keyword
(kWhere) @keyword
(kType) @keyword
(kTable) @keyword
(kFor) @keyword
(kLoop) @keyword

;; Types
(native_datatype_element) @type
(type_spec) @type

;; Functions/Procedures
(function_specification 
  (identifier) @function)
(procedure_specification 
  (identifier) @function)
(function_body 
  (identifier) @function)
(procedure_body 
  (identifier) @function)

;; Variables
(variable_declaration 
  (identifier) @variable)
(parameter_spec 
  (identifier) @parameter)

;; Literals
(_literal_string) @string
(_integer) @number
(_decimal_number) @number
(kTrue) @boolean
(kFalse) @boolean
(kNull) @constant

;; Comments
(comment) @comment
(marginalia) @comment

;; Operators
["+" "-" "*" "/" "=" "!=" "<" ">" "<=" ">=" ":=" "||"] @operator

;; Punctuation
["(" ")" "[" "]" "," "." ";"] @punctuation.delimiter