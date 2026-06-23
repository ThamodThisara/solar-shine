
import React from 'react';
import { ArrowRight, Calendar, User, Tag, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { BlogPost } from '@/types/payload-types';
import { Badge } from '@/components/ui/badge';

interface BlogSectionProps {
  posts: BlogPost[];
}

const formatDate = (dateString: string) => {
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

const BlogSection: React.FC<BlogSectionProps> = ({ posts }) => {
  return (
    <section className="section bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
          <div>
            <h2 className="section-title text-left text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Latest <span className="text-primary">Insights</span>
            </h2>
            <p className="section-subtitle text-left max-w-2xl text-lg text-gray-600 leading-relaxed">
              Stay updated with the latest news, trends, and innovations in solar energy.
              Discover cutting-edge solutions and industry insights from our expert team.
            </p>
          </div>
          <motion.a
            href="/blog"
            className="btn-secondary mt-6 md:mt-0 group inline-flex items-center px-6 py-3 bg-primary text-black font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View All Articles
            <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={18} />
          </motion.a>
        </div>

        {posts.filter(post => post.published).length === 0 ? (
          <motion.div
            className="text-center py-16 bg-white rounded-2xl shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No published articles yet</h3>
              <p className="text-gray-500">We're working on some great content. Check back soon!</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts
              .filter(post => post.published) // Only show published posts
              .slice(0, 3)
              .map((post, index) => (
                <motion.article
                  key={post.$id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group transform hover:-translate-y-2 border border-gray-100"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={post.featured_image || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        console.error('Image failed to load:', post.featured_image);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {post.excerpt || 'No excerpt available for this post.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{post.publishDate ? formatDate(post.publishDate) : 'No date'}</span>
                      </div>
                      <a
                        href={`/blog/${post.slug}`}
                        className="text-primary font-semibold hover:text-primary/80 flex items-center group-hover:text-primary transition-colors"
                      >
                        Read More
                        <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  </div>
                </motion.article>
              ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
