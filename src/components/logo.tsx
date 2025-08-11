import * as React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M6.55163 2.50015L14.6839 9.1189C15.4497 9.68396 15.4497 10.8163 14.6839 11.3814L6.55163 18.0001C5.64883 18.6483 4.50001 17.9041 4.50001 16.8188V3.68147C4.50001 2.59616 5.64883 1.85196 6.55163 2.50015Z" />
    <path
      d="M17.5 12C19.9853 12 22 9.98528 22 7.5C22 5.01472 19.9853 3 17.5 3C15.0147 3 13 5.01472 13 7.5C13 8.39961 13.2555 9.23199 13.6994 9.92928"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M17.5 12C19.9853 12 22 14.0147 22 16.5C22 18.9853 19.9853 21 17.5 21C15.0147 21 13 18.9853 13 16.5C13 15.6004 13.2555 14.768 13.6994 14.0707"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export default Logo;
