import SearchInterface from '../components/SearchInterface';
import AdminModule from '../components/AdminModule';
import FileManager from '../components/FileManager';

export default function Home() {
  return (
    <>
      <SearchInterface />
      
      {/* File Manager for authenticated users */}
      <div className="mt-8">
        <FileManager />
      </div>
      
      <AdminModule />
    </>
  );
}
