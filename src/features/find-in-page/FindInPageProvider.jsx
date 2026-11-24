import { FindInPageBar } from './FindInPageBar.jsx';
import { useFindInPage } from './useFindInPage.js';

export function FindInPageProvider({ children }) {
  const find = useFindInPage();

  return (
    <>
      {children}
      <FindInPageBar {...find.barProps} />
    </>
  );
}
