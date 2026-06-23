
import React, { useState, useEffect } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Testimonial } from '@/types/payload-types';

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ testimonials }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play testimonials
  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, testimonials.length - 2));
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, testimonials.length - 2));
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, testimonials.length - 2)) % Math.max(1, testimonials.length - 2));
    setIsAutoPlaying(false);
  };

  // Add slide direction for better animations
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handleNext = () => {
    setSlideDirection('right');
    nextTestimonial();
  };

  const handlePrev = () => {
    setSlideDirection('left');
    prevTestimonial();
  };

  // Show 3 testimonials at a time
  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + 3);

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-slate-200/30 to-gray-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-gray-200/30 to-slate-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-slate-200/60 shadow-sm mb-6"
          >
            <Star className="w-4 h-4 text-amber-500 fill-current" />
            <span className="text-sm font-medium text-slate-700">Trusted by 500+ Clients</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent mb-4"
          >
            What Our Clients Say
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
          >
            Hear from businesses and homeowners who have experienced the transformative benefits of our solar solutions.
          </motion.p>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          {/* Slide Counter */}
          {testimonials.length > 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 hidden lg:block"
            >
              <div className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-slate-200/60 shadow-sm">
                <span className="text-xs font-medium text-slate-700">
                  {currentIndex + 1} of {Math.max(1, testimonials.length - 2)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Navigation Arrows */}
          {testimonials.length > 3 && (
            <>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                onClick={handlePrev}
                className="absolute -left-12 top-1/2 -translate-y-1/2 z-20 group hidden lg:block"
                aria-label="Previous testimonial"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-slate-50 to-gray-50 backdrop-blur-sm rounded-full shadow-xl border border-slate-200/60 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:shadow-2xl group-hover:scale-110 group-hover:-translate-x-1 group-hover:border-slate-300/80">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-gray-700 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <ChevronLeft className="w-6 h-6 text-white transition-all duration-300 group-hover:scale-125" />
                  </div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                onClick={handleNext}
                className="absolute -right-12 top-1/2 -translate-y-1/2 z-20 group hidden lg:block"
                aria-label="Next testimonial"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-slate-50 to-gray-50 backdrop-blur-sm rounded-full shadow-xl border border-slate-200/60 flex items-center justify-center transition-all duration-300 group-hover:bg-white group-hover:shadow-2xl group-hover:scale-110 group-hover:translate-x-1 group-hover:border-slate-300/80">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-gray-700 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <ChevronRight className="w-6 h-6 text-white transition-all duration-300 group-hover:scale-125" />
                  </div>
                </div>
              </motion.button>
            </>
          )}

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-10 px-4 lg:px-20">
            <AnimatePresence mode="wait">
              {visibleTestimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.$id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="group relative"
                >
                  {/* Card Background */}
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-100/80 overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:scale-105 group-hover:bg-white group-hover:border-slate-200/60">
                    {/* Gradient Border Effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-500/5 via-gray-500/5 to-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Content */}
                    <div className="relative p-8">
                      {/* Quote Icon */}
                      <div className="absolute top-6 right-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-gray-100 rounded-full flex items-center justify-center shadow-lg">
                          <Quote className="w-8 h-8 text-slate-600" />
                        </div>
                      </div>

                      {/* Rating Stars */}
                      {testimonial.rating && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                          className="flex items-center gap-1 mb-6"
                        >
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 transition-all duration-200 ${i < (testimonial.rating || 0)
                                ? 'text-yellow-400 fill-current scale-110'
                                : 'text-gray-300'
                                }`}
                            />
                          ))}
                        </motion.div>
                      )}

                      {/* Testimonial Text */}
                      <motion.blockquote
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                        className="text-slate-700 mb-8 text-lg leading-relaxed italic font-medium"
                      >
                        "{testimonial.text}"
                      </motion.blockquote>

                      {/* Author Info */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                        className="border-t border-slate-100 pt-6"
                      >
                        <div className="flex items-center">
                          {/* Avatar */}
                          <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-gray-700 rounded-full flex items-center justify-center mr-4 shadow-lg">
                            <span className="text-white font-bold text-lg">
                              {testimonial.author?.charAt(0) || '?'}
                            </span>
                          </div>

                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-lg">{testimonial.author}</p>
                            <p className="text-slate-600 text-base">{testimonial.position}</p>
                            {testimonial.company && (
                              <p className="text-sm text-slate-500 font-medium">{testimonial.company}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Carousel Indicators and Mobile Navigation */}
          {testimonials.length > 3 && (
            <div className="mt-16">
              {/* Mobile Navigation Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="flex justify-center items-center gap-6 mb-8 lg:hidden"
              >
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 bg-gradient-to-r from-slate-600 to-gray-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-110 hover:from-slate-700 hover:to-gray-800 group"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-6 h-6 text-white transition-all duration-300 group-hover:scale-110" />
                </button>

                <button
                  onClick={handleNext}
                  className="w-14 h-14 bg-gradient-to-r from-slate-600 to-gray-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-110 hover:from-slate-700 hover:to-gray-800 group"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-6 h-6 text-white transition-all duration-300 group-hover:scale-110" />
                </button>
              </motion.div>

              {/* Carousel Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex justify-center space-x-4"
              >
                {Array.from({ length: Math.max(1, testimonials.length - 2) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      setIsAutoPlaying(false);
                    }}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${i === currentIndex
                      ? 'bg-gradient-to-r from-slate-600 to-gray-700 scale-125 shadow-lg ring-2 ring-slate-200'
                      : 'bg-gray-300 hover:bg-slate-200 hover:scale-110'
                      }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </motion.div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center mt-20"
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-700 to-gray-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <Star className="w-6 h-6 fill-current" />
            <span className="font-semibold text-lg">Join Our Happy Clients</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
