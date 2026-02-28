
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-brand-dark animate-fade-in">LeadGenFriend</h1>
              <span className="ml-2 text-sm bg-brand-light text-brand-dark px-2 py-0.5 rounded-full animate-bounce">Beta</span>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-fade-in">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-10">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          LeadGenFriend © {new Date().getFullYear()} - Process thousands of contacts in seconds
        </div>
      </footer>
    </div>
  );
};

export default Layout;

