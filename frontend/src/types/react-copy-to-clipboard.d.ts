declare module 'react-copy-to-clipboard' {
  import { Component } from 'react';

  interface CopyToClipboardProps {
    text: string;
    onCopy?: (text: string, result: boolean) => void;
    options?: {
      debug?: boolean;
      message?: string;
      format?: string;
    };
    children?: React.ReactNode;
  }

  export class CopyToClipboard extends Component<CopyToClipboardProps> {}
} 