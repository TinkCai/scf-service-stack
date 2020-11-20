const route = async (sr) => {
  sr.use('/test', async (req, res) => {
    console.log(req.cookies);
    res.cookie('sid', 'asdasdsadasdas');
    res.json(req.cookies);
  });
};

module.exports = route;
