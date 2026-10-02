import NavBar from "@/components/ui/NavBar";
import Footer from "@/components/ui/Footer";
import NeilAI from "@/components/os/NeilAI";
import CustomCursor from "@/components/ui/CustomCursor"; 
import "./globals.css"; 

export const metadata = {
  title: "Neil Jacob Santiago | Sys_Admin",
  description: "Network Systems & Infrastructure Engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-marine text-butter font-sans selection:bg-accentRed selection:text-marine cursor-none">
        
        {/* Global Components - These wrap every page automatically */}
        <CustomCursor />
        <NavBar />
        
        {/* The Page Content injects here */}
        {children}
        
        {/* Global Footer & Chatbot */}
        <NeilAI />
        <Footer />
        
      </body>
    </html>
  );
}