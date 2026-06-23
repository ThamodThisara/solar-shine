import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { fetchBlogPostBySlug } from '@/services/blogService';
import { BlogPost } from '@/types/payload-types';
import { Loader2, Calendar, User, ArrowLeft, Share2, BookOpen, Clock, Tag, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatReadingTime = (content: string | null) => {
  if (!content) return '2 min read';
  const wordsPerMinute = 200;
  const wordCount = content.split(' ').length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return `${readingTime} min read`;
};

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setError('No post slug provided.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const fetchedPost = await fetchBlogPostBySlug(slug);
        if (fetchedPost) {
          // Check if the post is published
          if (!fetchedPost.published) {
            setError('This article is not yet published.');
            setIsLoading(false);
            return;
          }
          setPost(fetchedPost);
        } else {
          setError('Blog post not found.');
        }
      } catch (err) {
        setError('Failed to fetch blog post.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title || 'Blog Post',
          text: post?.excerpt || 'Check out this interesting article',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-24">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading article...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="py-12 sm:py-16 text-center bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
          <div className="container-custom">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
                <p className="text-gray-600 mb-6">The article you're looking for couldn't be found.</p>
                <Link to="/blog">
                  <Button className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Blog
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!post) {
    return null; // Should be handled by error state
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <Header />
      <main className="pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="container-custom max-w-4xl mx-auto">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Hero Section */}
            {post.featured_image && (
              <motion.div
                className="relative h-96 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    {post.categories && post.categories.length > 0 && post.categories[0] !== 'uncategorized' ? (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {post.categories[0].charAt(0).toUpperCase() + post.categories[0].slice(1)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        Uncategorized
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                      {formatReadingTime(post.content)}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="p-6 sm:p-8">
              {/* Navigation */}
              <div className="mb-6 sm:mb-8">
                <Link to="/blog">
                  <Button variant="ghost" className="text-gray-500 hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to all posts
                  </Button>
                </Link>
              </div>

              {/* Article Header */}
              <motion.div
                className="mb-6 sm:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 sm:mb-6 leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 mb-4 sm:mb-6">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-primary" />
                    <span>{formatDate(post.publishDate)}</span>
                  </div>
                  {post.author && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      <span>{post.author}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-primary" />
                    <span>{formatReadingTime(post.content)}</span>
                  </div>
                </div>

                {post.excerpt && (
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border-l-4 border-primary">
                    <p className="text-base sm:text-lg text-gray-700 italic leading-relaxed">
                      "{post.excerpt}"
                    </p>
                  </div>
                )}
              </motion.div>

              <Separator className="my-6 sm:my-8" />

              {/* Article Content */}
              <div className="blog-content prose prose-lg max-w-none text-gray-800 leading-relaxed">
                {post.content ? (
                  <>
                    {/* Add proper spacing and formatting for content */}
                    {(() => {
                      const lines = post.content.split('\n');
                      const elements: JSX.Element[] = [];
                      let currentList: string[] = [];
                      let isInList = false;
                      let listType: 'ul' | 'ol' = 'ul';

                      const flushList = () => {
                        if (currentList.length > 0) {
                          const ListTag = listType === 'ul' ? 'ul' : 'ol';
                          elements.push(
                            <ListTag key={`list-${elements.length}`} className="mb-6 ml-6">
                              {currentList.map((item, idx) => (
                                <li key={idx} className="mb-2 text-gray-700 leading-6">
                                  {item}
                                </li>
                              ))}
                            </ListTag>
                          );
                          currentList = [];
                        }
                        isInList = false;
                      };

                      lines.forEach((line, index) => {
                        const trimmedLine = line.trim();

                        // Skip empty lines
                        if (!trimmedLine) {
                          if (isInList) {
                            flushList();
                          }
                          return;
                        }

                        // Check if it's a heading (starts with #)
                        if (trimmedLine.startsWith('#')) {
                          flushList();
                          const level = trimmedLine.match(/^#+/)?.[0].length || 1;
                          const text = trimmedLine.replace(/^#+\s*/, '');
                          const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;

                          elements.push(
                            <HeadingTag
                              key={index}
                              className={`font-bold text-gray-900 mb-4 mt-8 first:mt-0 ${level === 1 ? 'text-3xl' :
                                level === 2 ? 'text-2xl' :
                                  level === 3 ? 'text-xl' :
                                    level === 4 ? 'text-lg' : 'text-base'
                                }`}
                            >
                              {text}
                            </HeadingTag>
                          );
                          return;
                        }

                        // Check if it's a list item
                        const bulletMatch = trimmedLine.match(/^[-*]\s(.+)/);
                        const numberMatch = trimmedLine.match(/^\d+\.\s(.+)/);

                        if (bulletMatch || numberMatch) {
                          const itemText = bulletMatch ? bulletMatch[1] : numberMatch![1];
                          const newListType = bulletMatch ? 'ul' : 'ol';

                          // If we're starting a new list or switching list types
                          if (!isInList || listType !== newListType) {
                            flushList();
                            listType = newListType;
                            isInList = true;
                          }

                          currentList.push(itemText);
                          return;
                        }

                        // If we were in a list but this line isn't a list item, flush the list
                        if (isInList) {
                          flushList();
                        }

                        // Regular paragraph
                        elements.push(
                          <p key={index} className="mb-6 text-gray-700 leading-7 text-base">
                            {trimmedLine}
                          </p>
                        );
                      });

                      // Don't forget to flush any remaining list
                      flushList();

                      return elements;
                    })()}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No content available for this article.</p>
                  </div>
                )}
              </div>

              {/* Article Footer */}
              <motion.div
                className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Link to="/blog">
                      <Button variant="default" size="sm">
                        <BookOpen className="h-4 w-4 mr-2" />
                        More Articles
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.article>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostPage;
