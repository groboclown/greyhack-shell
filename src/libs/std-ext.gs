// Standard library extensions

// list.Contains() Does the list contain the value?
list.Contains = function(val)
    return self.indexOf(val) != null
end if

// string.Contains() Does the string contain the substring?
string.Contains = function(val)
    return self.indexOf(val) != null
end if

// string.ContainsOne() Does the string contain at least one of the arguments?
//
// If the argument is a list, then does this string contain at least one of the
// substrings in the list?
// If the argument is a string, then does this string contain at least one of the
// characters in the argument?
string.ContainsOne = function(val)
    for idx in val.indexes
        if self.indexOf(val[idx]) != null return true
    end for
    return false
end if
