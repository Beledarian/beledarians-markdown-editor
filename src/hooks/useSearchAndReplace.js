import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Custom hook managing search, replace, match indexing, and find/replace modal visibility.
 */
export function useSearchAndReplace(markdown, setMarkdown) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const handleFind = useCallback((query) => {
    setSearchQuery(query);
    setMatchIndex(0);
  }, []);

  const handleReplace = useCallback((findText, replaceText, matchCase = false, isRegex = false) => {
    if (!findText) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const regexStr = isRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(regexStr, flags);
      
      let replaced = false;
      const newVal = markdown.replace(regex, (match) => {
        if (!replaced) {
          replaced = true;
          return replaceText;
        }
        return match;
      });

      if (replaced) {
        setMarkdown(newVal);
        toast.success('Replaced 1 occurrence');
      } else {
        toast('No occurrences found');
      }
    } catch (e) {
      toast.error(`Invalid regex: ${e.message}`);
    }
  }, [markdown, setMarkdown]);

  const handleReplaceAll = useCallback((findText, replaceText, matchCase = false, isRegex = false) => {
    if (!findText) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const regexStr = isRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(regexStr, flags);
      const count = (markdown.match(regex) || []).length;
      if (count > 0) {
        setMarkdown(markdown.replace(regex, () => replaceText));
        toast.success(`Replaced ${count} occurrences`);
      } else {
        toast('No occurrences found');
      }
    } catch (e) {
      toast.error(`Invalid regex: ${e.message}`);
    }
  }, [markdown, setMarkdown]);

  return {
    showGlobalSearch,
    setShowGlobalSearch,
    showFindReplace,
    setShowFindReplace,
    searchQuery,
    setSearchQuery,
    replaceQuery,
    setReplaceQuery,
    matchIndex,
    setMatchIndex,
    handleFind,
    handleReplace,
    handleReplaceAll
  };
}
