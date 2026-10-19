import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Mahendra Real Estate | Building Your Dream Home',description:'Residential and commercial construction. Projects, documentation, attendance, and payments — professional and streamlined.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
