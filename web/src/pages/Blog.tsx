import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag, ArrowRight, Search, Filter, Grid3X3, List, Clock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchBlogPosts } from '@/services/blogService';
import { BlogPost } from '@/types/payload-types';
import { Link } from 'react-router-dom';

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatRelativeTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  const now = new Date();
  const postDate = new Date(dateString);
  const diffTime = Math.abs(now.getTime() - postDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
};

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const fetchedPosts = await fetchBlogPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Failed to fetch blog posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, []);

  // Extract unique categories from posts, defaulting to "Uncategorized" if no categories
  const categories = ["All", ...Array.from(new Set(
    posts
      .filter(post => post.published) // Only consider published posts for category list
      .map(p => {
        // If categories array exists and has items, use the first category
        if (p.categories && p.categories.length > 0 && p.categories[0] !== 'uncategorized') {
          // Capitalize first letter of category
          const category = p.categories[0];
          return category.charAt(0).toUpperCase() + category.slice(1);
        }
        // Otherwise return "Uncategorized"
        return "Uncategorized";
      })
  )).filter(category => category !== "Uncategorized" || posts.some(p =>
    p.published && (!p.categories || p.categories.length === 0 || p.categories[0] === 'uncategorized')
  ))]; // Only show "Uncategorized" if there are actually uncategorized posts

  const filteredAndSortedPosts = posts
    .filter(post => {
      // Only show published posts
      if (!post.published) return false;

      // Check if the post matches the selected category
      const matchesCategory =
        activeCategory === "All" ||
        // Check in categories array if it exists (case-insensitive)
        (post.categories && post.categories.some(cat =>
          cat.toLowerCase() === activeCategory.toLowerCase()
        )) ||
        // If no categories and "Uncategorized" is selected
        (!post.categories && activeCategory === "Uncategorized");

      // Check if the post matches the search query
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.publishDate || 0);
        const dateB = new Date(b.publishDate || 0);
        return dateB.getTime() - dateA.getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const BlogCard = ({ post, index }: { post: BlogPost; index: number }) => (
    <motion.div
      className="bg-white rounded-2xl shadow-lg overflow-hidden group transform hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="relative h-64 overflow-hidden">
          <img
            src={post.featured_image || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-800 hover:bg-white">
              {post.categories && post.categories.length > 0 && post.categories[0] !== 'uncategorized'
                ? post.categories[0].charAt(0).toUpperCase() + post.categories[0].slice(1)
                : "Uncategorized"}
            </Badge>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatRelativeTime(post.publishDate || '')}</span>
            </div>
            {post.author && (
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{post.author}</span>
              </div>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {post.excerpt || 'No excerpt available for this post.'}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center text-brand-gray text-sm">
              <Eye className="h-4 w-4 mr-1" />
              <span>Read more</span>
            </div>
            <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );

  const BlogListItem = ({ post, index }: { post: BlogPost; index: number }) => (
    <motion.div
      className="bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300 border border-gray-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
            <img
              src={post.featured_image || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="md:w-2/3 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {post.categories && post.categories.length > 0 && post.categories[0] !== 'uncategorized'
                    ? post.categories[0].charAt(0).toUpperCase() + post.categories[0].slice(1)
                    : "Uncategorized"}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(post.publishDate || '')}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                {post.excerpt || 'No excerpt available for this post.'}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              {post.author && (
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>{post.author}</span>
                </div>
              )}
              <div className="flex items-center text-primary font-medium">
                Read more <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Header />
      <main className="pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="container-custom">
          {/* Header Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              Solar Energy <span className="text-primary">Insights</span> & News
            </h1>
            <p className="max-w-3xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed">
              Stay updated with the latest trends, technologies, and news in the solar energy industry.
              Discover innovative solutions and industry insights from our expert team.
            </p>
          </motion.div>

          {/* Search and Filter Section */}
          <div className="mb-12 space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search articles by title or content..."
                className="pl-12 pr-4 py-4 text-base rounded-full shadow-lg border-0 focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Category Filters */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={activeCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full transition-all duration-200 ${activeCategory === category
                      ? 'bg-primary text-black shadow-lg hover:bg-primary/90'
                      : 'hover:bg-gray-100 hover:border-primary/30'
                      }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('date')}
                  className="rounded-lg"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Latest
                </Button>
                <Button
                  variant={sortBy === 'title' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('title')}
                  className="rounded-lg"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  A-Z
                </Button>
                <div className="flex items-center bg-white rounded-lg p-1 shadow-sm">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-md"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-md"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-8 text-center">
            <p className="text-gray-600">
              {filteredAndSortedPosts.length} published article{filteredAndSortedPosts.length !== 1 ? 's' : ''} found
              {searchQuery && ` for "${searchQuery}"`}
              {activeCategory !== 'All' && ` in ${activeCategory}`}
            </p>
          </div>

          {/* Blog Content */}
          {isLoading ? (
            <div className={`grid gap-8 ${viewMode === 'grid'
              ? 'md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
              }`}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-64 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedPosts.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="max-w-md mx-auto">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No published articles found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || activeCategory !== 'All'
                    ? 'Try adjusting your search terms or category filter to find what you\'re looking for.'
                    : 'We\'re working on some great content. Check back soon!'
                  }
                </p>
                {(searchQuery || activeCategory !== 'All') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('All');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewMode}-${sortBy}-${activeCategory}-${searchQuery}`}
                className={`grid gap-8 ${viewMode === 'grid'
                  ? 'md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
                  }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {filteredAndSortedPosts.map((post, index) =>
                  viewMode === 'grid' ? (
                    <BlogCard key={post.$id} post={post} index={index} />
                  ) : (
                    <BlogListItem key={post.$id} post={post} index={index} />
                  )
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
