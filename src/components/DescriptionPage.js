import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { message, Spin } from "antd";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Document, Page, pdfjs } from "react-pdf";

import CommentSection from "./CommentSection";
import ShareArticle from "./ShareArticle";
import CertificateGenerator from "./CertificateGenerator";

import {
  createSlug,
  extractTextFromHTML,
  fetchProducts,
  fetchAllTopics,
  calculateResults,
  getNextTopic,
  getPrevTopic,
} from "../hooks/useDescriptionLogic";

import "../assets/css/description.css";

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Description() {
  const { subCategory, topicSlug } = useParams();
  console.log("Subcategory:", subCategory, "Topic Slug:", topicSlug);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mcqs, setMcqs] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState({});
  const [answerFeedback, setAnswerFeedback] = useState({});
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showReviewSection, setShowReviewSection] = useState(false);
  const [allTopics, setAllTopics] = useState([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(null);
  const [userName, setUserName] = useState("");
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const productsList = await fetchProducts(subCategory, topicSlug);
        console.log("Fetched products:", productsList);
        setProducts(productsList);
        setMcqs(productsList[0]?.mcqs || []);
        setLoading(false);

        const topicsList = await fetchAllTopics(subCategory);
        setAllTopics(topicsList);

        const currentTopicIdx = topicsList.findIndex(
          (topic) => topic.id === topicSlug || topic.slug === topicSlug
        );
        setCurrentTopicIndex(currentTopicIdx);
      } catch (error) {
        message.error("Failed to fetch data.");
        console.error(error);
      }
    })();
  }, [subCategory, topicSlug]);

  const handleAnswerChange = (event) => {
    const { value } = event.target;
    setSelectedAnswer({
      ...selectedAnswer,
      [currentMcqIndex]: value,
    });
  };

  const handleNextQuestion = () => {
    const currentMcq = mcqs[currentMcqIndex];
    const selected = selectedAnswer[currentMcqIndex];

    if (selected === undefined) {
      message.error("Please select an answer before moving to the next question.");
      return;
    }

    const feedback = selected === currentMcq.correctAnswer ? "Correct!" : "Incorrect.";
    setAnswerFeedback({
      ...answerFeedback,
      [currentMcqIndex]: feedback,
    });

    if (currentMcqIndex + 1 < mcqs.length) {
      setCurrentMcqIndex(currentMcqIndex + 1);
    } else {
      if (!userName) {
        const name = prompt("Please enter your name: ");
        setUserName(name || "Guest");
      }
      setShowResults(true);
    }
  };

  const handleRetakeTest = () => {
    setSelectedAnswer({});
    setAnswerFeedback({});
    setCurrentMcqIndex(0);
    setShowResults(false);
    setShowReviewSection(false);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <div className="description-container mt-5" >
      {!loading && products.length > 0 && (
        <>
          <title>Gramture - {products[0].topic}</title>
          <meta
            name="description"
            content={extractTextFromHTML(products[0].description).substring(0, 150)}
          />
        </>
      )}

      {loading && (
        <div className="loader-overlay">
          <Spin size="large" />
        </div>
      )}

      {products.length > 0 && (
        <>
          <h1 className="topic-title">{products[0].topic}</h1>

          {products.map((product) => (
            <article key={product.id} className="product-article">
              <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description }} />
            </article>
          ))}

          <Document
            file={products[0].notesFile}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<Spin size="large" tip="Loading PDF..." />}
            error={<div className="text-red-500">Failed to load PDF</div>}
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            ))}
          </Document>

          {/* MCQ Section */}
          {/* ... Keep your MCQ rendering code here as before ... */}

          <CertificateGenerator
            mcqs={mcqs}
            selectedAnswer={selectedAnswer}
            userName={userName}
            calculateResults={() => calculateResults(mcqs, selectedAnswer)}
            handleRetakeTest={handleRetakeTest}
            topicName={products[0]?.topic}
          />

          <ShareArticle />

          <div className="topic-navigation">
            {getPrevTopic(allTopics, currentTopicIndex) &&
              getPrevTopic(allTopics, currentTopicIndex).subCategory === subCategory &&
              getPrevTopic(allTopics, currentTopicIndex).class === products[0].class && (
                <Link
                  to={`/description/${subCategory}/${getPrevTopic(allTopics, currentTopicIndex).slug}`}
                  className="prev-button"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <FaChevronLeft className="nav-icon" /> Previous Topic:{" "}
                  {getPrevTopic(allTopics, currentTopicIndex).topic}
                </Link>
              )}

            {getNextTopic(allTopics, currentTopicIndex) &&
              getNextTopic(allTopics, currentTopicIndex).subCategory === subCategory &&
              getNextTopic(allTopics, currentTopicIndex).class === products[0].class && (
                <Link
                  to={`/description/${subCategory}/${getNextTopic(allTopics, currentTopicIndex).slug}`}
                  className="next-button"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  Next Topic: {getNextTopic(allTopics, currentTopicIndex).topic}{" "}
                  <FaChevronRight className="nav-icon" />
                </Link>
              )}
          </div>

          <CommentSection subCategory={subCategory} topicId={products[0]?.id} />
        </>
      )}
    </div>
  );
}



