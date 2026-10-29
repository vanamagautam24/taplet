//! A deliberately small, dependency-free suffix matcher. It never stores typed text.

fn boundary(before: &str) -> bool {
    before.chars().next_back().map_or(true, |c| {
        c.is_whitespace() || matches!(c, '(' | '[' | '{' | '"' | '\'' | '—' | '–')
    })
}

pub fn match_suffix(text: &str, shortcuts: &str) -> i32 {
    shortcuts.lines().enumerate()
        .filter(|(_, key)| !key.is_empty())
        .filter(|(_, key)| text.strip_suffix(key).is_some_and(boundary))
        .max_by_key(|(_, key)| key.len())
        .map_or(-1, |(index, _)| index as i32)
}

#[cfg(target_arch = "wasm32")]
mod abi {
    #[no_mangle]
    pub extern "C" fn alloc(len: usize) -> *mut u8 {
        Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
    }

    #[no_mangle]
    pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
    }

    #[no_mangle]
    pub unsafe extern "C" fn find_shortcut(
        text: *const u8, text_len: usize, shortcuts: *const u8, shortcuts_len: usize,
    ) -> i32 {
        let text = std::str::from_utf8(std::slice::from_raw_parts(text, text_len));
        let shortcuts = std::str::from_utf8(std::slice::from_raw_parts(shortcuts, shortcuts_len));
        match (text, shortcuts) {
            (Ok(text), Ok(shortcuts)) => super::match_suffix(text, shortcuts),
            _ => -1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expands_at_boundaries_and_keeps_original_index() {
        let keys = "/hello\n/nba\n;bye";
        for text in ["/nba", "Hi /nba", "( /nba", "\n/nba", "“hi”\u{2003}/nba"] {
            assert_eq!(match_suffix(text, keys), 1, "{text}");
        }
        assert_eq!(match_suffix(";bye", keys), 2);
    }

    #[test]
    fn does_not_expand_inside_words_urls_or_partial_shortcuts() {
        for text in ["word/nba", "https://nba", "email@example/nba", "/nb", "/nba ", "/NBA"] {
            assert_eq!(match_suffix(text, "/nba"), -1, "{text}");
        }
        assert_eq!(match_suffix("", ""), -1);
    }

    #[test]
    fn handles_unicode_and_chooses_longest_match() {
        assert_eq!(match_suffix("🙂 /你好", "/hello\n/你好"), 1);
        assert_eq!(match_suffix(" /a/b", "/b\n/a/b"), 1);
        assert_eq!(match_suffix(" /nba", "\n/nba"), 1);
    }
}
