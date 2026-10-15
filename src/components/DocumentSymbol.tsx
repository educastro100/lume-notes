import {
  FileText,
  BriefcaseBusiness,
  BookOpen,
  Lightbulb,
  Code2,
  ListTodo,
  Heart,
  Music2,
} from 'lucide-react';
import { type DocumentIcon } from '../documents';

const symbols = {
  file: FileText,
  work: BriefcaseBusiness,
  study: BookOpen,
  idea: Lightbulb,
  code: Code2,
  tasks: ListTodo,
  personal: Heart,
  music: Music2,
};
export function DocumentSymbol({ icon, size = 16 }: { icon: DocumentIcon; size?: number }) {
  const Symbol = symbols[icon];
  return <Symbol size={size} aria-hidden="true" />;
}
