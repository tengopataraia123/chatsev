import BlogView from '@/components/blog/BlogView';

interface BlogsViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

const BlogsView = ({ onBack, onUserClick }: BlogsViewProps) => {
  return <BlogView onUserClick={onUserClick} />;
};

export default BlogsView;
