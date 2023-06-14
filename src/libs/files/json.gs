// Pulled from:
//   https://github.com/JoeStrout/miniscript/blob/master/MiniScript-cpp/lib/json.ms
// Under the MIT License.
// Modified to be in the "FileLib" namespace.

if not globals.hasIndex("FileLib") then globals.FileLib = {}
FileLib.Json = {}

//
// JSON (JavaScript Object Notation) is a common format for exchanging data
// between different computers or programs.  See: https://json.org/
// The data types in JSON are number, string, object, and array, which
// correspond very neatly to MiniScript's number, string, map, and list.
//
// This module provides code to read and write data in JSON format, as well
// as a couple of utility functions for escaping/unescaping strings and
// converting numbers to/from hexadecimal.


// parse: convert a JSON string into a MiniScript value (which could
//	include a list or map of other values).  This is the main entry point
//	for reading JSON data and converting it to native form.
//	Example: parse("42")		// returns 42
FileLib.Json.parse = function(jsonString)
	//if jsonString isa RawData then jsonString = jsonString.utf8
	p = new FileLib.Json.Parser
	return p.parse(jsonString)
end function

// toJSON: convert a MiniScript value to its JSON representation.
//	Example: toJSON(42)			// returns "42"
//
// Parameters:
//	value: MiniScript value to convert
//	compact: if true, omit all unnecessary whitespace
//	indent: amount to indent if multiple lines are needed
FileLib.Json.toJSON = function(value, compact=false, indent=0)
	if @value isa funcRef then return """<function>"""
	if value == null then return "null"
	if value isa number then return str(value)
	if value isa string then return """" + FileLib.Json.escape(value) + """"
	if value isa list then return FileLib.Json._listToJSON(value, compact, indent)
	if value isa map then return FileLib.Json._mapToJSON(value, compact, indent)
end function

// hexToInt: convert a string containing a hexadecimal number.
//	Supports both uppercase and lowercase for digits A-F.
//	Example: hexToInt("002A") 	// returns 42
FileLib.Json.hexToInt = function(s)
	result = 0
	for c in s
		result = result * 16 + FileLib.Json._hexDigitMap[c]
	end for
	return result
end function

// escape: find certain characters (tab, newline, etc.) in the given string,
// and represent them with backslash sequences.
//	Example: escape(char(9))	// returns "\t"
FileLib.Json.escape = function(s)
	for i in FileLib.Json._escapeIndexes
		s = s.replace(FileLib.Json._escapeFrom[i], FileLib.Json._escapeTo[i])
	end for
	return s
end function

// unescape: replace backslash sequences in the given string.
//	Example: unescape("\t")		// returns char(9)
FileLib.Json.unescape = function(s)
	result = []
	i = 0
	maxi = s.len
	while i < maxi
		di = 1
		if s[i] == "\" then
			di = 2
			c = s[i+1]
			if c == "b" then
				result.push char(8)
			else if c == "t" then
				result.push char(9)
			else if c == "n" then
				result.push char(10)
			else if c == "f" then
				result.push char(12)
			else if c == "r" then
				result.push char(13)
			else if c == "u" then
				// Unicode code point (must always be 4 digits)
				hex = s[i+2:i+6]
				result.push char(FileLib.Json.hexToInt(hex))
				di = 6
			else
				result.push c
			end if
		else
			result.push s[i]
		end if
		i = i + di
	end while
	return result.join("")
end function

//----------------------------------------------------------------------
// Stuff below is internal implementation; 
// most users don't need to poke around here.

// Parsing JSON

FileLib.Json.Parser = {}
FileLib.Json.Parser.source = ""
FileLib.Json.Parser._sourceLen = 0
FileLib.Json.Parser._p = 0		// index of next character to consume in source

FileLib.Json.Parser.init = function(source)
	self.source = source
	self._sourceLen = source.len
end function

FileLib.Json.Parser.parse = function(source=null)
	if source != null then self.init source
	self._p = 0
	return self._parseElement
end function

FileLib.Json.whitespace = " " + char(9) + char(10) + char(13)
FileLib.Json.Parser._skipWhitespace = function
	while self._p < self._sourceLen
		if FileLib.Json.whitespace.indexOf(self.source[self._p]) == null then break
		self._p = self._p + 1
	end while
end function
		
FileLib.Json.Parser._parseElement = function
	return self._parseValue	// for now!
end function

FileLib.Json.Parser._parseValue = function
	self._skipWhitespace
	c = self.source[self._p]
	if c == """" then return self._parseString
	if "0123456789-.".indexOf(c) != null then return self._parseNumber
	if c == "[" then return self._parseList
	if c == "{" then return self._parseMap
	if c == "t" and self.source[self._p:self._p+4] == "true" then
		self._p = self._p + 4
		return true
	end if
	if c == "f" and self.source[self._p:self._p+5] == "false" then
		self._p = self._p + 5
		return false
	end if
	if c == "n" and self.source[self._p:self._p+4] == "null" then
		self._p = self._p + 4
		return null
	end if
end function

FileLib.Json.Parser._parseList = function
	self._p = self._p + 1		// skip "["
	self._skipWhitespace
	result = []
	while self._p < self._sourceLen
		c = self.source[self._p]
		if c == "]" then break
		result.push self._parseElement
		self._skipWhitespace
		// after an element, we should have either a comma or a ']'
		c = self.source[self._p]
		if c == "," then
			self._p = self._p + 1
			self._skipWhitespace
		end if
	end while
	self._p = self._p + 1
	return result
end function

FileLib.Json.Parser._parseMap = function
	self._p = self._p + 1		// skip "{"
	self._skipWhitespace
	result = {}
	while self._p < self._sourceLen
		// grab the key (must be a string)
		c = self.source[self._p]
		if c == "}" then break
		if c != """" then
			print "JSON error: object member key must be a string literal"	// ToDo: better error handling!
			print "Error at position " + self._p + ": " + self.source[self._p-60 : self._p+60]
			return null
		end if
		key = self._parseString
		self._skipWhitespace
		
		// next token must be a colon
		if self.source[self._p] != ":" then
			print "JSON error: colon expected"
			print "Error at position " + self._p + ": " + self.source[self._p-60 : self._p+60]
			return null
		end if
		self._p = self._p + 1
		self._skipWhitespace
		
		// grab the value (could be anything)
		value = self._parseElement
		result[key] = value
		self._skipWhitespace
		
		// after a a key/value pair, we should have either a comma or a '}'
		c = self.source[self._p]
		if c == "," then
			self._p = self._p + 1
			self._skipWhitespace
		end if
	end while
	self._p = self._p + 1
	return result
end function

// Get a string literal from the source.  Advance to the next
// character after the closing quote.
FileLib.Json.Parser._parseString = function
	self._p = self._p + 1
	startPos = self._p
	anyEscape = false
	while self._p < self._sourceLen
		c = self.source[self._p]
		self._p = self._p + 1
		if c == """" then break
		if c == "\" then
			anyEscape = true
			self._p = self._p + 1
		end if
	end while
	result = self.source[startPos : self._p-1]
	if anyEscape then result = FileLib.Json.unescape(result)
	return result
end function

// Get a numeric literal from the source.  Advance to the next
// character after the number.
FileLib.Json.Parser._parseNumber = function
	startPos = self._p
	while self._p < self._sourceLen
		c = self.source[self._p]
		// Note that we are rather permissive here, consuming things like
		// 1-2e5+4E7, which is not valid JSON.  But we're not trying to be
		// a JSON validator; we're just trying to grok valid JSON as quickly
		// as we can.
		if "0123456789+-.eE".indexOf(c) == null then break
		self._p = self._p + 1
	end while
	result = val(self.source[startPos : self._p])
	return result
end function

// Generating JSON

FileLib.Json._listToJSON = function(lst, compact, indent)
	ws = (FileLib.Json._eol + "  "*(indent+1)) * (not compact)
	parts = ["[", ws]
	first = true
	for item in lst
		if not first then
			parts.push ","
			parts.push ws
		end if
		parts.push FileLib.Json.toJSON(item, compact, indent+1)
		first = false
	end for
	if not compact then parts.push FileLib.Json._eol + "  " * indent
	parts.push "]"
	return join(parts, "")
end function

FileLib.Json._mapToJSON = function(lst, compact, indent)
	ws = (FileLib.Json._eol + "  "*(indent+1)) * (not compact)
	parts = ["{", ws]
	first = true
	for kv in lst
		if not first then
			parts.push ","
			parts.push ws
		end if
		parts.push FileLib.Json.toJSON(str(kv.key))
		parts.push ":"
		if not compact then parts.push " "
		parts.push FileLib.Json.toJSON(@kv.value, compact, indent+1)
		first = false
	end for
	if not compact then parts.push FileLib.Json._eol + "  " * indent
	parts.push "}"
	return join(parts, "")
end function

// General utility data structures

FileLib.Json._eol = char(13)
FileLib.Json._hexDigitMap = {}
for i in range(0,15)
	if i < 10 then
		FileLib.Json._hexDigitMap[str(i)] = i
	else
		FileLib.Json._hexDigitMap[char(55+i)] = i	// (lowercase hex digit)
		FileLib.Json._hexDigitMap[char(87+i)] = i	// (uppercase hex digit)
	end if
end for

FileLib.Json._escapeFrom = ["\", """", char(8), char(9), char(10), char(12), char(13)]
FileLib.Json._escapeTo = ["\\", "\""", "\b","\t","\n","\f","\r"]
FileLib.Json._escapeIndexes = FileLib.Json._escapeFrom.indexes
