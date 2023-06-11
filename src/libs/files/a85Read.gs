// Implementation of Ascii85 decoding

// Requires importing "binary-read.gs" first.

FileLib.A85Reader = {}
FileLib.A85Reader.alphabet = "!""#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstu"
FileLib.A85Reader._zero = "!".code
FileLib.A85Reader._85 = "u".code
FileLib.A85Reader._4z = "z".code
FileLib.A85Reader._4y = "y".code

FileLib.A85Reader.New = function(fileOrContents)
    ret = FileLib.BinaryReader.New(fileOrContents)
	if ret == null then return null
	ret.buffer_bit_size = 8
	ret.load_buffer = @FileLib.A85Reader.decode_bytes
	// For padding purposes, an implied 'uuuu' is added to the end of the
	// source content.
	ret.content = ret.content + "uuuu"
	return ret
end function


FileLib.A85Reader.decode_bytes = function()
	currx = 0
	curr = [0, 0, 0, 0, 0]
	ret = 0
	while self.read_pos < self.content.len
		c = self.content[self.read_pos]
		self.read_pos = self.read_pos + 1
		x = c.code
		if x >= FileLib.A85Reader._zero and x <= FileLib.A85Reader._85 then
			curr[currx] = x
			currx = currx + 1
			if currx == 5 then
				// Filled up the next bits.
				acc = 0
				for x in curr
					acc = 85 * acc + (x - FileLib.A85Reader._zero)
				end for
				self.buffer.push(floor(acc / 16777216) % 256)
				self.buffer.push(floor(acc / 65536) % 256)
				self.buffer.push(floor(acc / 256) % 256)
				self.buffer.push(acc % 256)
				ret = 4
				break
			end if
		else if x == FileLib.A85Reader._4z then
			// equivalent to 4 0s.
			self.buffer.push(0)
			self.buffer.push(0)
			self.buffer.push(0)
			self.buffer.push(0)
			ret = 4
			break
		else if x == FileLib.A85Reader._4y then
			// equivalent to 4 0x20s.
			self.buffer.push(32)
			self.buffer.push(32)
			self.buffer.push(32)
			self.buffer.push(32)
			ret = 4
			break
		// else ignore the character
		end if
	end while

	// Check for if there's possible padding to consume
	left = self.content.len - self.read_pos
	if left < 5 then
		// Remove the padding.
		padding = 4 - left
		if padding > 0 then
			self.buffer = self.buffer[:-padding]
			ret = ret - padding
		end if
		self.read_pos = self.content.len
	end if

	return ret
end function
