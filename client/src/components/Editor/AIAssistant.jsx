// src/components/Editor/AIAssistant.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  AutoAwesome,
//   Grammar,
//   Enhancement,
  Summarize,
  AutoMode,
  Lightbulb,
  Close,
  ExpandMore,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { useSocket } from '../../services/socketService';
import apiService from '../../services/apiService';
import toast from 'react-hot-toast';

const AIAssistant = ({ documentId, selectedText, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const { socket, aiProcessing, on, off } = useSocket();

  useEffect(() => {
    checkAIStatus();
    
    if (socket) {
      const handleAISuggestions = (data) => {
        setResults(prev => ({
          ...prev,
          [data.analysisType]: data
        }));
        setLoading(false);
      };

      const handleAICompletion = (data) => {
        setResults(prev => ({
          ...prev,
          completion: data
        }));
        setLoading(false);
      };

      on('ai-suggestions-ready', handleAISuggestions);
      on('ai-completion-ready', handleAICompletion);

      return () => {
        off('ai-suggestions-ready', handleAISuggestions);
        off('ai-completion-ready', handleAICompletion);
      };
    }
  }, [socket, on, off]);

  const checkAIStatus = async () => {
    try {
      const response = await apiService.getAIStatus();
      setAiStatus(response.data);
    } catch (error) {
      setAiStatus({ status: 'error' });
    }
  };

  const handleAIRequest = async (type, options = {}) => {
    const text = inputText || selectedText;
    if (!text.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }

    setLoading(true);

    try {
      switch (type) {
        case 'grammar':
          const grammarResponse = await apiService.checkGrammar(text);
          setResults(prev => ({ ...prev, grammar: grammarResponse.data }));
          break;
        
        case 'enhance':
          const enhanceResponse = await apiService.enhanceText(text, options);
          setResults(prev => ({ ...prev, enhance: enhanceResponse.data }));
          break;
        
        case 'summarize':
          const summarizeResponse = await apiService.summarizeText(text, options);
          setResults(prev => ({ ...prev, summarize: summarizeResponse.data }));
          break;
        
        case 'complete':
          const completeResponse = await apiService.completeText(text, options);
          setResults(prev => ({ ...prev, complete: completeResponse.data }));
          break;
        
        case 'suggestions':
          const suggestionsResponse = await apiService.getSuggestions(text, options);
          setResults(prev => ({ ...prev, suggestions: suggestionsResponse.data }));
          break;
        
        default:
          break;
      }
    } catch (error) {
      toast.error(`AI ${type} failed`);
    } finally {
      setLoading(false);
    }
  };

  const renderGrammarResults = () => {
    const data = results.grammar?.analysis;
    if (!data) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6">Grammar Check</Typography>
          <Chip
            label={`Score: ${data.overallScore}/100`}
            color={data.overallScore >= 80 ? 'success' : data.overallScore >= 60 ? 'warning' : 'error'}
            size="small"
          />
        </Box>
        
        {data.summary && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {data.summary}
          </Alert>
        )}

        {data.corrections?.length > 0 ? (
          <List dense>
            {data.corrections.map((correction, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Error color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={correction.suggestion}
                  secondary={`${correction.type}: ${correction.explanation}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="success">
            No grammar issues found!
          </Alert>
        )}
      </Box>
    );
  };

  const renderEnhanceResults = () => {
    const data = results.enhance?.enhancement;
    if (!data) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Enhanced Text</Typography>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body1">
              {data.enhancedText}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" onClick={() => {
              navigator.clipboard.writeText(data.enhancedText);
              toast.success('Enhanced text copied to clipboard');
            }}>
              Copy Enhanced Text
            </Button>
          </CardActions>
        </Card>

        {data.changes?.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>View Changes ({data.changes.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {data.changes.map((change, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Enhancement />
                    </ListItemIcon>
                    <ListItemText
                      primary={change.type}
                      secondary={change.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const renderSummarizeResults = () => {
    const data = results.summarize?.summarization;
    if (!data) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Summary</Typography>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body1" paragraph>
              {data.summary}
            </Typography>
            
            {data.keyPoints?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Key Points:
                </Typography>
                <List dense>
                  {data.keyPoints.map((point, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={point} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>

        {data.wordCount && (
          <Alert severity="info">
            Reduced from {data.wordCount.original} to {data.wordCount.summary} words
          </Alert>
        )}
      </Box>
    );
  };

  const renderCompletionResults = () => {
    const data = results.complete?.completion;
    if (!data) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Text Completion</Typography>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Original text:
            </Typography>
            <Typography variant="body1" paragraph>
              {data.originalText}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Suggested completion:
            </Typography>
            <Typography variant="body1" sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
              {data.completion}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small" onClick={() => {
              navigator.clipboard.writeText(data.completion);
              toast.success('Completion copied to clipboard');
            }}>
              Copy Completion
            </Button>
          </CardActions>
        </Card>

        {data.alternativeCompletions?.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Alternative Completions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {data.alternativeCompletions.map((alt, index) => (
                <Card key={index} sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2">{alt}</Typography>
                  </CardContent>
                </Card>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const tabLabels = ['Grammar', 'Enhance', 'Summarize', 'Complete', 'Suggestions'];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          AI Assistant
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      {/* AI Status */}
      {aiStatus && (
        <Alert 
          severity={aiStatus.status === 'operational' ? 'success' : 'error'} 
          sx={{ mb: 2 }}
        >
          AI Service: {aiStatus.status}
        </Alert>
      )}

      {/* Input Area */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Enter text to analyze or enhance..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Grammar" icon={<Grammar />} />
        <Tab label="Enhance" icon={<Enhancement />} />
        <Tab label="Summarize" icon={<Summarize />} />
        <Tab label="Complete" icon={<AutoMode />} />
        <Tab label="Suggestions" icon={<Lightbulb />} />
      </Tabs>

      {/* Action Buttons */}
      <Box sx={{ mb: 2 }}>
        {activeTab === 0 && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleAIRequest('grammar')}
            disabled={loading || aiProcessing}
            startIcon={loading ? <CircularProgress size={16} /> : <Grammar />}
          >
            Check Grammar
          </Button>
        )}
        
        {activeTab === 1 && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleAIRequest('enhance')}
            disabled={loading || aiProcessing}
            startIcon={loading ? <CircularProgress size={16} /> : <Enhancement />}
          >
            Enhance Text
          </Button>
        )}
        
        {activeTab === 2 && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleAIRequest('summarize')}
            disabled={loading || aiProcessing}
            startIcon={loading ? <CircularProgress size={16} /> : <Summarize />}
          >
            Summarize
          </Button>
        )}
        
        {activeTab === 3 && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleAIRequest('complete')}
            disabled={loading || aiProcessing}
            startIcon={loading ? <CircularProgress size={16} /> : <AutoMode />}
          >
            Complete Text
          </Button>
        )}
        
        {activeTab === 4 && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleAIRequest('suggestions')}
            disabled={loading || aiProcessing}
            startIcon={loading ? <CircularProgress size={16} /> : <Lightbulb />}
          >
            Get Suggestions
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Results Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading || aiProcessing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              AI is processing your request...
            </Typography>
          </Box>
        ) : (
          <>
            {activeTab === 0 && renderGrammarResults()}
            {activeTab === 1 && renderEnhanceResults()}
            {activeTab === 2 && renderSummarizeResults()}
            {activeTab === 3 && renderCompletionResults()}
            {activeTab === 4 && renderSuggestionsResults()}
          </>
        )}
      </Box>
    </Box>
  );

  function renderSuggestionsResults() {
    const data = results.suggestions?.analysis;
    if (!data) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Writing Suggestions</Typography>
        
        {data.overallAssessment && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Overall Assessment
              </Typography>
              
              {data.overallAssessment.strengths?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="success.main" gutterBottom>
                    Strengths:
                  </Typography>
                  <List dense>
                    {data.overallAssessment.strengths.map((strength, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary={strength} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {data.overallAssessment.areas_for_improvement?.length > 0 && (
                <Box>
                  <Typography variant="body2" color="warning.main" gutterBottom>
                    Areas for Improvement:
                  </Typography>
                  <List dense>
                    {data.overallAssessment.areas_for_improvement.map((area, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={area} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {data.suggestions?.length > 0 && (
          data.suggestions.map((suggestion, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={suggestion.category}
                    size="small"
                    color={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'default'}
                  />
                  <Chip
                    label={suggestion.priority}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body1" gutterBottom>
                  {suggestion.suggestion}
                </Typography>
                {suggestion.example && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Example: {suggestion.example}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
    );
  }
};

export default AIAssistant;