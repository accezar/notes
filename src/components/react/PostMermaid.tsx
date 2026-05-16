import { useEffect } from 'react';
import { initMermaidInArticle } from '../../scripts/mermaid-client';

export default function PostMermaid() {
	useEffect(() => {
		void initMermaidInArticle();
	}, []);

	return null;
}
